package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import com.ceyiz.app.dto.AddSetToListRequest;
import com.ceyiz.app.dto.AddSetToListResponse;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.SetTemplate;
import com.ceyiz.app.entity.SetTemplateItem;
import com.ceyiz.app.entity.SetTemplatePrice;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.SetTemplateItemRepository;
import com.ceyiz.app.repository.SetTemplatePriceRepository;
import com.ceyiz.app.repository.SetTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductSetService {

    private final ProductSetRepository productSetRepository;
    private final SetItemRepository setItemRepository;
    private final ListAccessService listAccessService;
    private final SetTemplateRepository setTemplateRepository;
    private final SetTemplateItemRepository setTemplateItemRepository;
    private final SetTemplatePriceRepository setTemplatePriceRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    private static final Locale TR = Locale.forLanguageTag("tr");

    @Transactional
    public ProductSet createSet(UUID listId, CreateProductSetRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);

        ProductSet set = new ProductSet(listId, request.name(), request.storeName(), request.setPrice());
        ProductSet savedSet = productSetRepository.save(set);

        for (var itemRequest : request.items()) {
            SetItem item = new SetItem(
                    savedSet.getId(),
                    itemRequest.productId(),
                    itemRequest.itemName(),
                    itemRequest.quantity(),
                    itemRequest.estimatedIndividualPrice()
            );
            setItemRepository.save(item);
        }

        return savedSet;
    }

    /**
     * Katalog setini listeye ekler; katalogdaki set olduğu gibi kalır. Liste tarafında: set (tek fiyatla),
     * her parça için bir ürün (sete bağlı) ve ürünlerin kategorilere dağılımı. Mutfak parçaları
     * Mutfak > 4 standart alt kategoriye (KitchenGroups) yerleşir; eşleşmeyen parça Mutfak'ta kategorisiz
     * kalır. Set hiç mutfak parçası içermiyorsa parçalar setin adıyla açılan kategoriye girer.
     * Listede aynı adlı ürün varsa yenisi açılmaz, mevcut ürün sete bağlanır. Fiyat sadece sette durur
     * (ürünler fiyatsızdır), böylece özet ve ödeme planı set fiyatını bir kez sayar.
     */
    @Transactional
    public AddSetToListResponse addFromTemplate(UUID listId, AddSetToListRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);
        if (request.setTemplateId() == null) {
            throw new IllegalArgumentException("Set seçilmeli");
        }
        SetTemplate template = setTemplateRepository.findById(request.setTemplateId())
                .filter(found -> found.isCreatedByAdmin() || requesterId.equals(found.getCreatedBy()))
                .orElseThrow(() -> new IllegalArgumentException("Set bulunamadı"));
        if (productSetRepository.existsByListIdAndSetTemplateId(listId, template.getId())) {
            throw new IllegalArgumentException("Bu set zaten listende");
        }

        List<SetTemplateItem> items = setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Setin parçası yok");
        }
        SetTemplatePrice price = pickPrice(
                setTemplatePriceRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId()), request.priceId());
        BigDecimal total = price == null ? null : totalOf(price);
        boolean installment = price != null && price.getPriceType() == PriceType.TAKSITLI;

        ProductSet set = productSetRepository.save(new ProductSet(
                listId, template.getName(), price == null ? null : price.getStoreName(),
                total == null ? BigDecimal.ZERO : total, template.getId(),
                price == null ? null : price.getPriceType(),
                installment ? price.getInstallmentCount() : null,
                installment ? price.getInstallmentAmount() : null));

        List<Category> categories = new ArrayList<>(categoryRepository.findByListId(listId));
        Map<UUID, List<Product>> productsByCategory = new HashMap<>();
        boolean kitchenSet = items.stream().anyMatch(item -> KitchenGroups.classify(item.getItemName()).isPresent());
        Category kitchen = kitchenSet ? findOrCreateCategory(listId, null, "Mutfak", categories) : null;
        Category setCategory = kitchenSet ? null : findOrCreateCategory(listId, null, template.getName(), categories);

        int created = 0;
        int linked = 0;
        for (SetTemplateItem item : items) {
            Category target;
            if (kitchenSet) {
                String group = KitchenGroups.classify(item.getItemName()).orElse(null);
                target = group == null ? kitchen : findOrCreateCategory(listId, kitchen.getId(), group, categories);
            } else {
                target = setCategory;
            }

            String productName = item.getQuantity() > 1
                    ? item.getItemName() + " (" + item.getQuantity() + " adet)" : item.getItemName();
            List<Product> existing = productsByCategory.computeIfAbsent(
                    target.getId(), id -> new ArrayList<>(productRepository.findByCategoryId(id)));
            Product product = existing.stream()
                    .filter(found -> normalize(found.getName()).equals(normalize(productName)))
                    .findFirst().orElse(null);
            if (product == null) {
                product = productRepository.save(new Product(target.getId(), productName));
                existing.add(product);
                created++;
            } else {
                linked++;
            }
            setItemRepository.save(new SetItem(
                    set.getId(), product.getId(), item.getItemName(), item.getQuantity(), item.getEstimatedSeparatePrice()));
        }
        return new AddSetToListResponse(set.getId(), set.getName(), set.getSetPrice(), created, linked);
    }

    // priceId verilmişse o fiyat (bu sete ait olmalı); yoksa toplamı hesaplanabilen en ucuz fiyat.
    private static SetTemplatePrice pickPrice(List<SetTemplatePrice> prices, UUID priceId) {
        if (priceId != null) {
            return prices.stream().filter(price -> price.getId().equals(priceId)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Fiyat bu sete ait değil"));
        }
        return prices.stream().filter(price -> totalOf(price) != null)
                .min(Comparator.comparing(ProductSetService::totalOf)).orElse(null);
    }

    /** Peşin fiyat; yoksa taksit sayısı × taksit tutarı (ListSummaryService.totalOf ile aynı kural). */
    private static BigDecimal totalOf(SetTemplatePrice price) {
        if (price.getCashPrice() != null) return price.getCashPrice();
        if (price.getInstallmentCount() != null && price.getInstallmentAmount() != null) {
            return price.getInstallmentAmount().multiply(BigDecimal.valueOf(price.getInstallmentCount()));
        }
        return null;
    }

    // Listede aynı üst kategoride aynı adlı kategori varsa o, yoksa yenisi açılır.
    private Category findOrCreateCategory(UUID listId, UUID parentId, String name, List<Category> categories) {
        Category found = categories.stream()
                .filter(category -> Objects.equals(category.getParentId(), parentId))
                .filter(category -> normalize(category.getName()).equals(normalize(name)))
                .findFirst().orElse(null);
        if (found != null) return found;
        Category created = categoryRepository.save(
                parentId == null ? new Category(listId, name) : new Category(listId, parentId, name));
        categories.add(created);
        return created;
    }

    private static String normalize(String name) {
        return name.strip().replaceAll("\\s+", " ").toLowerCase(TR);
    }

    public List<ProductSet> getSetsForList(UUID listId, UUID requesterId) {
        listAccessService.requireAtLeastViewer(listId, requesterId);

        return productSetRepository.findByListId(listId);
    }
}
