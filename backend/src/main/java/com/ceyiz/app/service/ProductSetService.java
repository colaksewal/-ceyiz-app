package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import com.ceyiz.app.dto.AddSetToListRequest;
import com.ceyiz.app.dto.AddSetToListResponse;
import com.ceyiz.app.dto.AttachSetToProductRequest;
import com.ceyiz.app.dto.AttachSetToProductResponse;
import com.ceyiz.app.entity.PriceEntry;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.dto.SetPlacementPreview;
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
import java.util.Set;
import java.util.stream.Collectors;
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
    private final PriceEntryRepository priceEntryRepository;

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

    private static final String SKIP_KEY = "skip";
    private static final String KITCHEN = "Mutfak";

    /**
     * Ekleme öncesi önizleme: her parçanın önerilen hedefi (mutfak parçaları Mutfak alt kategorilerine,
     * diğerleri setin adıyla açılacak kategoriye) ve seçilebilecek tüm hedefler. Hiçbir şey yazılmaz.
     */
    @Transactional(readOnly = true)
    public SetPlacementPreview previewPlacement(UUID listId, UUID setTemplateId, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);
        SetTemplate template = visibleTemplate(setTemplateId, requesterId);
        List<SetTemplateItem> items = setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        List<Category> categories = categoryRepository.findByListId(listId);
        boolean kitchenSet = isKitchenSet(items);
        return new SetPlacementPreview(
                items.stream()
                        .map(item -> new SetPlacementPreview.Item(item.getId(), item.getItemName(), item.getQuantity(),
                                suggestedKey(item, kitchenSet, categories, template.getName())))
                        .toList(),
                destinations(categories, template.getName()));
    }

    /**
     * Katalog setini listeye ekler; katalogdaki set olduğu gibi kalır. Liste tarafında: set (tek fiyatla),
     * her parça için bir ürün (sete bağlı) ve ürünlerin kategorilere dağılımı. Parçanın kategorisini kullanıcı
     * önizlemede seçer (placements); seçilmeyen parça önerilen hedefe gider ("skip" parçayı listeye eklemez,
     * sadece sette kalır). Listede aynı adlı ürün varsa yenisi açılmaz, mevcut ürün sete bağlanır. Fiyat sadece
     * sette durur (ürünler fiyatsızdır), böylece özet ve ödeme planı set fiyatını bir kez sayar.
     */
    @Transactional
    public AddSetToListResponse addFromTemplate(UUID listId, AddSetToListRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);
        if (request.setTemplateId() == null) {
            throw new IllegalArgumentException("Set seçilmeli");
        }
        SetTemplate template = visibleTemplate(request.setTemplateId(), requesterId);
        if (productSetRepository.existsByListIdAndSetTemplateId(listId, template.getId())) {
            throw new IllegalArgumentException("Bu set zaten listende");
        }

        List<SetTemplateItem> items = setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Setin parçası yok");
        }
        Map<UUID, String> chosen = new HashMap<>();
        for (AddSetToListRequest.Placement placement : request.placements() == null
                ? List.<AddSetToListRequest.Placement>of() : request.placements()) {
            if (items.stream().noneMatch(item -> item.getId().equals(placement.setTemplateItemId()))) {
                throw new IllegalArgumentException("Bu sete ait olmayan parça");
            }
            chosen.put(placement.setTemplateItemId(), placement.destinationKey());
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
        // Kullanıcının seçebileceği "yeni açılacak" hedefler ekleme başında sabitlenir (rastgele ad açtırılmasın).
        Set<String> allowedNewKeys = destinations(categories, template.getName()).stream()
                .map(SetPlacementPreview.Destination::key).filter(key -> key.startsWith("n:"))
                .collect(Collectors.toSet());
        boolean kitchenSet = isKitchenSet(items);
        List<Category> initialCategories = List.copyOf(categories);
        Map<UUID, List<Product>> productsByCategory = new HashMap<>();

        int created = 0;
        int linked = 0;
        for (SetTemplateItem item : items) {
            String key = chosen.getOrDefault(item.getId(),
                    suggestedKey(item, kitchenSet, initialCategories, template.getName()));
            if (SKIP_KEY.equals(key)) {
                setItemRepository.save(new SetItem(set.getId(), null, item.getItemName(), item.getQuantity(),
                        item.getEstimatedSeparatePrice()));
                continue;
            }
            Category target = resolveDestination(listId, key, categories, allowedNewKeys);

            String productName = item.getQuantity() > 1
                    ? item.getItemName() + " (" + item.getQuantity() + " adet)" : item.getItemName();
            List<Product> existing = productsByCategory.computeIfAbsent(
                    target.getId(), id -> new ArrayList<>(productRepository.findByCategoryId(id)));
            Product product = existing.stream()
                    .filter(found -> normalize(found.getName()).equals(normalize(productName)))
                    .findFirst().orElse(null);
            if (product == null) {
                product = new Product(target.getId(), productName);
                product.changeUrl(item.getUrl());
                product = productRepository.save(product);
                existing.add(product);
                created++;
            } else {
                // Mevcut ürünün linki yoksa parçanın linki eklenir; varsa dokunulmaz.
                if (product.getUrl() == null && item.getUrl() != null) {
                    product.changeUrl(item.getUrl());
                    productRepository.save(product);
                }
                linked++;
            }
            setItemRepository.save(new SetItem(
                    set.getId(), product.getId(), item.getItemName(), item.getQuantity(), item.getEstimatedSeparatePrice()));
        }
        return new AddSetToListResponse(set.getId(), set.getName(), set.getSetPrice(), created, linked);
    }

    /**
     * Katalog setini listedeki MEVCUT bir ürüne ekler (örn. sette "Korkmaz tencere seti", listede "Çelik tencere
     * seti" ürünü): setin fiyat(lar)ı ürüne fiyat notu olarak girer, set içeriği nota yazılır. Yeni ürün ya da
     * kategori açılmaz; özet ve ödeme planı ürünün fiyat notlarını zaten kullandığı için ek bir hesap gerekmez.
     * Aynı fiyat aynı ürüne ikinci kez eklenmez.
     */
    @Transactional
    public AttachSetToProductResponse attachToProduct(UUID productId, AttachSetToProductRequest request, UUID requesterId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        Category category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);
        if (request.setTemplateId() == null) {
            throw new IllegalArgumentException("Set seçilmeli");
        }
        SetTemplate template = visibleTemplate(request.setTemplateId(), requesterId);

        List<SetTemplatePrice> prices = setTemplatePriceRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        if (request.priceId() != null) {
            prices = List.of(pickPrice(prices, request.priceId()));
        }
        if (prices.isEmpty()) {
            throw new IllegalArgumentException("Setin fiyatı girilmemiş");
        }

        String contents = setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId()).stream()
                .map(item -> item.getQuantity() > 1 ? item.getQuantity() + "× " + item.getItemName() : item.getItemName())
                .collect(Collectors.joining(", "));
        String storeFallback = template.getBrand() != null && !template.getBrand().isBlank()
                ? template.getBrand() : template.getName();

        List<PriceEntry> existing = priceEntryRepository.findByProductId(productId);
        int added = 0;
        for (SetTemplatePrice price : prices) {
            String note = "Set: " + template.getName() + (contents.isEmpty() ? "" : " — " + contents)
                    + (price.getPaymentPlanNote() == null || price.getPaymentPlanNote().isBlank()
                            ? "" : " (" + price.getPaymentPlanNote().strip() + ")");
            String store = price.getStoreName() != null && !price.getStoreName().isBlank()
                    ? price.getStoreName().strip() : storeFallback;
            boolean duplicate = existing.stream().anyMatch(entry -> note.equals(entry.getPaymentPlanNote())
                    && store.equals(entry.getStoreName()) && price.getPriceType() == entry.getPriceType()
                    && Objects.equals(price.getCashPrice(), entry.getCashPrice())
                    && Objects.equals(price.getInstallmentCount(), entry.getInstallmentCount()));
            if (duplicate) continue;
            boolean taksitli = price.getPriceType() == PriceType.TAKSITLI;
            priceEntryRepository.save(new PriceEntry(
                    productId, store, price.getPriceType(), price.getCashPrice(),
                    taksitli ? price.getInstallmentCount() : null,
                    taksitli ? price.getInstallmentAmount() : null,
                    note, template.getImageUrl()));
            added++;
        }
        if (added == 0) {
            throw new IllegalArgumentException("Bu set fiyatı bu ürüne zaten eklenmiş");
        }
        // Ürünün linki yoksa setin linki ürüne eklenir.
        if (product.getUrl() == null && template.getUrl() != null) {
            product.changeUrl(template.getUrl());
            productRepository.save(product);
        }
        return new AttachSetToProductResponse(productId, product.getName(), added);
    }

    private SetTemplate visibleTemplate(UUID setTemplateId, UUID requesterId) {
        return setTemplateRepository.findById(setTemplateId)
                .filter(found -> found.isCreatedByAdmin() || requesterId.equals(found.getCreatedBy()))
                .orElseThrow(() -> new IllegalArgumentException("Set bulunamadı"));
    }

    private static boolean isKitchenSet(List<SetTemplateItem> items) {
        return items.stream().anyMatch(item -> KitchenGroups.classify(item.getItemName()).isPresent());
    }

    // Mutfak setinde parça sınıflandırıcının bulduğu alt kategoriye, bulunamazsa Mutfak'a; mutfak olmayan
    // sette setin adıyla açılan kategoriye önerilir.
    private static String suggestedKey(SetTemplateItem item, boolean kitchenSet, List<Category> categories, String setName) {
        if (!kitchenSet) return keyFor(categories, null, setName);
        String group = KitchenGroups.classify(item.getItemName()).orElse(null);
        return group == null ? keyFor(categories, null, KITCHEN) : keyFor(categories, KITCHEN, group);
    }

    // Kategori listede varsa "c:<id>", yoksa eklenirken açılacak olarak "n:<üst ad>|<ad>" (üst yoksa boş).
    private static String keyFor(List<Category> categories, String parentName, String name) {
        Category parent = parentName == null ? null : findCategory(categories, null, parentName);
        if (parentName != null && parent == null) return "n:" + parentName + "|" + name;
        Category found = findCategory(categories, parent == null ? null : parent.getId(), name);
        return found != null ? "c:" + found.getId() : "n:" + (parentName == null ? "" : parentName) + "|" + name;
    }

    private static Category findCategory(List<Category> categories, UUID parentId, String name) {
        return categories.stream()
                .filter(category -> Objects.equals(category.getParentId(), parentId))
                .filter(category -> normalize(category.getName()).equals(normalize(name)))
                .findFirst().orElse(null);
    }

    private static List<SetPlacementPreview.Destination> destinations(List<Category> categories, String setName) {
        Map<UUID, String> names = categories.stream().collect(Collectors.toMap(Category::getId, Category::getName));
        List<SetPlacementPreview.Destination> result = new ArrayList<>(categories.stream()
                .map(category -> new SetPlacementPreview.Destination("c:" + category.getId(),
                        category.getParentId() == null || !names.containsKey(category.getParentId())
                                ? category.getName() : names.get(category.getParentId()) + " › " + category.getName()))
                .sorted(Comparator.comparing(SetPlacementPreview.Destination::label, String.CASE_INSENSITIVE_ORDER))
                .toList());

        // Henüz listede olmayan standart Mutfak kategorileri ve setin adıyla kategori de seçilebilir.
        String kitchenKey = keyFor(categories, null, KITCHEN);
        if (kitchenKey.startsWith("n:")) {
            result.add(new SetPlacementPreview.Destination(kitchenKey, KITCHEN + " (yeni)"));
        }
        for (String group : KitchenGroups.ALL) {
            String key = keyFor(categories, KITCHEN, group);
            if (key.startsWith("n:")) {
                result.add(new SetPlacementPreview.Destination(key, KITCHEN + " › " + group + " (yeni)"));
            }
        }
        String setKey = keyFor(categories, null, setName);
        if (setKey.startsWith("n:")) {
            result.add(new SetPlacementPreview.Destination(setKey, setName + " (yeni)"));
        }
        result.add(new SetPlacementPreview.Destination(SKIP_KEY, "Listeye ekleme (sadece sette kalsın)"));
        return result;
    }

    // "c:" anahtarı bu listenin kategorisi olmalı; "n:" anahtarı ekleme başında sunulan yeni hedeflerden biri.
    private Category resolveDestination(UUID listId, String key, List<Category> categories, Set<String> allowedNewKeys) {
        if (key != null && key.startsWith("c:")) {
            UUID id;
            try {
                id = UUID.fromString(key.substring(2));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Geçersiz hedef kategori");
            }
            return categories.stream().filter(category -> category.getId().equals(id)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Hedef kategori bulunamadı"));
        }
        if (key != null && allowedNewKeys.contains(key)) {
            String rest = key.substring(2);
            int bar = rest.indexOf('|');
            String parentName = rest.substring(0, bar);
            String name = rest.substring(bar + 1);
            Category parent = parentName.isEmpty() ? null : findOrCreateCategory(listId, null, parentName, categories);
            return findOrCreateCategory(listId, parent == null ? null : parent.getId(), name, categories);
        }
        throw new IllegalArgumentException("Geçersiz hedef kategori");
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
        Category found = findCategory(categories, parentId, name);
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
