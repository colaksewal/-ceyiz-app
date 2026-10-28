package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.entity.ProductSet;
import com.ceyiz.app.entity.SetItem;
import com.ceyiz.app.repository.ProductSetRepository;
import com.ceyiz.app.repository.SetItemRepository;
import com.ceyiz.app.dto.AddSetToListRequest;
import com.ceyiz.app.dto.AddPartRequest;
import com.ceyiz.app.dto.AddPartResponse;
import com.ceyiz.app.dto.AddSetAsProductRequest;
import com.ceyiz.app.dto.AddSetAsProductResponse;
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
        List<Product> products = productsOf(categories);
        boolean kitchenSet = isKitchenSet(items);
        return new SetPlacementPreview(
                items.stream()
                        .map(item -> new SetPlacementPreview.Item(item.getId(), item.getItemName(), item.getQuantity(),
                                suggestedKey(item, kitchenSet, categories, products, template.getName())))
                        .toList(),
                suggestedSetKey(template.getName(), items, categories),
                placementCategories(categories, template.getName()),
                products.stream()
                        .map(product -> new SetPlacementPreview.Product(
                                "p:" + product.getId(), product.getName(), "c:" + product.getCategoryId()))
                        .toList());
    }

    // Set tek ürün olarak eklenirken önerilen kategori: set adı mutfak grubuna giriyorsa o (Cam Bardak Seti -> Sofra
    // Ürünleri), yoksa parçaların en çok denk geldiği grup; mutfak değilse setin adıyla açılacak kategori.
    private static String suggestedSetKey(String setName, List<SetTemplateItem> items, List<Category> categories) {
        String group = KitchenGroups.classify(setName).orElse(null);
        if (group == null) {
            group = items.stream()
                    .map(item -> KitchenGroups.classify(item.getItemName()).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.groupingBy(g -> g, Collectors.counting()))
                    .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        }
        return group == null ? keyFor(categories, null, setName) : keyFor(categories, KITCHEN, group);
    }

    // Kademeli seçim için kategoriler: listedekiler ile eklenirken açılacak olanlar (Mutfak, standart Mutfak
    // alt kategorileri, setin adıyla kategori). Anahtarlar keyFor ile aynıdır, böylece ekleme isteğinde doğrulanır.
    private static List<SetPlacementPreview.Category> placementCategories(List<Category> categories, String setName) {
        List<SetPlacementPreview.Category> result = new ArrayList<>(categories.stream()
                .map(category -> new SetPlacementPreview.Category("c:" + category.getId(), category.getName(),
                        category.getParentId() == null ? null : "c:" + category.getParentId(), false))
                .toList());
        String kitchenKey = keyFor(categories, null, KITCHEN);
        if (kitchenKey.startsWith("n:")) {
            result.add(new SetPlacementPreview.Category(kitchenKey, KITCHEN, null, true));
        }
        for (String group : KitchenGroups.ALL) {
            String key = keyFor(categories, KITCHEN, group);
            if (key.startsWith("n:")) {
                result.add(new SetPlacementPreview.Category(key, group, kitchenKey, true));
            }
        }
        String setKey = keyFor(categories, null, setName);
        if (setKey.startsWith("n:")) {
            result.add(new SetPlacementPreview.Category(setKey, setName, null, true));
        }
        return result;
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
        Map<UUID, String> customNames = new HashMap<>();
        for (AddSetToListRequest.Placement placement : request.placements() == null
                ? List.<AddSetToListRequest.Placement>of() : request.placements()) {
            if (items.stream().noneMatch(item -> item.getId().equals(placement.setTemplateItemId()))) {
                throw new IllegalArgumentException("Bu sete ait olmayan parça");
            }
            chosen.put(placement.setTemplateItemId(), placement.destinationKey());
            if (placement.newProductName() != null && !placement.newProductName().isBlank()) {
                customNames.put(placement.setTemplateItemId(), placement.newProductName().strip());
            }
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
        Map<UUID, Product> listProducts = productsOf(categories).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        Set<String> allowedNewKeys = placementCategories(categories, template.getName()).stream()
                .map(SetPlacementPreview.Category::key).filter(key -> key.startsWith("n:"))
                .collect(Collectors.toSet());
        boolean kitchenSet = isKitchenSet(items);
        List<Category> initialCategories = List.copyOf(categories);
        Map<UUID, List<Product>> productsByCategory = new HashMap<>();

        int created = 0;
        int linked = 0;
        for (SetTemplateItem item : items) {
            String key = chosen.getOrDefault(item.getId(),
                    suggestedKey(item, kitchenSet, initialCategories, List.copyOf(listProducts.values()), template.getName()));
            if (SKIP_KEY.equals(key)) {
                setItemRepository.save(new SetItem(set.getId(), null, item.getItemName(), item.getQuantity(),
                        item.getEstimatedSeparatePrice()));
                continue;
            }
            if (key != null && key.startsWith("p:")) {
                // Parça listedeki mevcut bir ürüne eklenir: ayrı fiyatı ürüne fiyat notu olur, link ürüne geçer.
                Product product = listProducts.get(parseId(key.substring(2)));
                if (product == null) {
                    throw new IllegalArgumentException("Hedef ürün bulunamadı");
                }
                attachPartToProduct(product, item, template);
                setItemRepository.save(new SetItem(set.getId(), product.getId(), item.getItemName(),
                        item.getQuantity(), item.getEstimatedSeparatePrice()));
                linked++;
                continue;
            }
            Category target = resolveDestination(listId, key, categories, allowedNewKeys);

            // Kullanıcı yeni ürüne kendi adını yazdıysa o; yoksa parçanın adı (adet varsa "(N adet)" ile).
            String productName = customNames.getOrDefault(item.getId(), item.getQuantity() > 1
                    ? item.getItemName() + " (" + item.getQuantity() + " adet)" : item.getItemName());
            if (productName.length() > 255) {
                throw new IllegalArgumentException("Ürün adı en fazla 255 karakter olabilir");
            }
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

        int added = addPriceNotes(product, template, prices, true);
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

    /**
     * Setin TEK bir kalemini listeye ekler (set kaydı açılmaz): "c:"/"n:" hedefte kalem yeni ürün olur (kullanıcı ad
     * yazdıysa o adla), "p:" hedefte listedeki mevcut ürüne eklenir. Her iki durumda kalemin ayrı fiyatı ürüne fiyat
     * notu, linki ürünün linki olur (bkz. attachPartToProduct). Kategoride aynı adlı ürün varsa yenisi açılmaz.
     */
    @Transactional
    public AddPartResponse addPart(UUID listId, AddPartRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);
        if (request.setTemplateItemId() == null) {
            throw new IllegalArgumentException("Kalem seçilmeli");
        }
        SetTemplateItem item = setTemplateItemRepository.findById(request.setTemplateItemId())
                .orElseThrow(() -> new IllegalArgumentException("Kalem bulunamadı"));
        SetTemplate template = visibleTemplate(item.getSetTemplateId(), requesterId);

        String key = request.destinationKey();
        Product product;
        boolean created = false;
        if (key != null && key.startsWith("p:")) {
            product = productRepository.findById(parseId(key.substring(2)))
                    .orElseThrow(() -> new IllegalArgumentException("Hedef ürün bulunamadı"));
            Category productCategory = categoryRepository.findById(product.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
            if (!productCategory.getListId().equals(listId)) {
                throw new IllegalArgumentException("Hedef ürün bu listeye ait değil");
            }
        } else {
            List<Category> categories = new ArrayList<>(categoryRepository.findByListId(listId));
            Set<String> allowedNewKeys = placementCategories(categories, template.getName()).stream()
                    .map(SetPlacementPreview.Category::key).filter(k -> k.startsWith("n:"))
                    .collect(Collectors.toSet());
            Category target = resolveDestination(listId, key, categories, allowedNewKeys);

            String name = request.newProductName() == null || request.newProductName().isBlank()
                    ? (item.getQuantity() > 1 ? item.getItemName() + " (" + item.getQuantity() + " adet)" : item.getItemName())
                    : request.newProductName().strip();
            if (name.length() > 255) {
                throw new IllegalArgumentException("Ürün adı en fazla 255 karakter olabilir");
            }
            product = productRepository.findByCategoryId(target.getId()).stream()
                    .filter(found -> normalize(found.getName()).equals(normalize(name)))
                    .findFirst().orElse(null);
            if (product == null) {
                product = new Product(target.getId(), name);
                product.changeUrl(item.getUrl());
                product = productRepository.save(product);
                created = true;
            }
        }
        attachPartToProduct(product, item, template);
        return new AddPartResponse(product.getId(), product.getName(), created);
    }

    /**
     * Seti listede TEK ÜRÜN olarak ekler ("Cam Bardak Seti"): ürün setin adı (ya da kullanıcının yazdığı ad), linki
     * ve fiyat notlarıyla seçilen kategoride açılır; setin parçaları adetleriyle ürünün altında listelenir.
     * Fiyat sadece ürünün fiyat notlarında durur, setin kendisi özet/ödeme planında ayrıca sayılmaz.
     */
    @Transactional
    public AddSetAsProductResponse addAsProduct(UUID listId, AddSetAsProductRequest request, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);
        if (request.setTemplateId() == null) {
            throw new IllegalArgumentException("Set seçilmeli");
        }
        SetTemplate template = visibleTemplate(request.setTemplateId(), requesterId);

        // Aynı set aynı listeye bir kez eklenir. İstisnalar, yeniden eklenebilsin diye eski kayıt silinir:
        //  - ürünü silinmiş (artık hiçbir ürünün bağlı olmadığı) set ürünü,
        //  - eskiden "parçaları tek tek yerleştir" ile eklenmiş liste seti (sadece set kaydı gider; o sırada açılan
        //    parça ürünlerine dokunulmaz, kullanıcı gerekirse onları siler).
        ProductSet previous = productSetRepository.findByListIdAndSetTemplateId(listId, template.getId()).orElse(null);
        if (previous != null) {
            if (previous.isAsProduct() && productRepository.existsByProductSetId(previous.getId())) {
                throw new IllegalArgumentException("Bu set zaten listende");
            }
            productSetRepository.delete(previous);
            productSetRepository.flush();
        }

        List<SetTemplateItem> items = setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        if (items.isEmpty()) {
            throw new IllegalArgumentException("Setin parçası yok");
        }
        List<SetTemplatePrice> allPrices = setTemplatePriceRepository.findBySetTemplateIdOrderByDisplayOrder(template.getId());
        List<SetTemplatePrice> prices = request.priceId() != null
                ? List.of(pickPrice(allPrices, request.priceId())) : allPrices;

        String productName = request.productName() == null || request.productName().isBlank()
                ? template.getName() : request.productName().strip();
        if (productName.length() > 255) {
            throw new IllegalArgumentException("Ürün adı en fazla 255 karakter olabilir");
        }

        List<Category> categories = new ArrayList<>(categoryRepository.findByListId(listId));
        Set<String> allowedNewKeys = placementCategories(categories, template.getName()).stream()
                .map(SetPlacementPreview.Category::key).filter(key -> key.startsWith("n:"))
                .collect(Collectors.toSet());
        Category target = resolveDestination(listId, request.categoryKey(), categories, allowedNewKeys);

        SetTemplatePrice cheapest = pickPrice(allPrices, null);
        BigDecimal total = cheapest == null ? null : totalOf(cheapest);
        ProductSet set = new ProductSet(listId, template.getName(), cheapest == null ? null : cheapest.getStoreName(),
                total == null ? BigDecimal.ZERO : total, template.getId(), null, null, null);
        set.markAsProduct();
        set = productSetRepository.save(set);

        Product product = new Product(target.getId(), productName);
        product.changeUrl(template.getUrl());
        product.linkToSet(set.getId());
        product = productRepository.save(product);

        int partCount = 0;
        for (SetTemplateItem item : items) {
            setItemRepository.save(new SetItem(set.getId(), null, item.getItemName(), item.getQuantity(),
                    item.getEstimatedSeparatePrice()));
            partCount += item.getQuantity();
        }
        int notes = addPriceNotes(product, template, prices, false);
        return new AddSetAsProductResponse(product.getId(), product.getName(), partCount, notes);
    }

    // Setin fiyat(lar)ını ürüne fiyat notu olarak ekler; aynı not tekrar eklenmez. includeContents: not içine parça
    // listesi de yazılır (mevcut ürüne eklerken; set ürün olarak eklenince parçalar zaten ürünün altında görünür).
    private int addPriceNotes(Product product, SetTemplate template, List<SetTemplatePrice> prices, boolean includeContents) {
        String contents = !includeContents ? "" : setTemplateItemRepository
                .findBySetTemplateIdOrderByDisplayOrder(template.getId()).stream()
                .map(item -> item.getQuantity() > 1 ? item.getQuantity() + "× " + item.getItemName() : item.getItemName())
                .collect(Collectors.joining(", "));
        String storeFallback = template.getBrand() != null && !template.getBrand().isBlank()
                ? template.getBrand() : template.getName();

        List<PriceEntry> existing = priceEntryRepository.findByProductId(product.getId());
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
                    product.getId(), store, price.getPriceType(), price.getCashPrice(),
                    taksitli ? price.getInstallmentCount() : null,
                    taksitli ? price.getInstallmentAmount() : null,
                    note, template.getImageUrl(), template.getUrl()));
            added++;
        }
        return added;
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
    private static String suggestedKey(SetTemplateItem item, boolean kitchenSet, List<Category> categories,
                                       List<Product> products, String setName) {
        // Listede parçayla aynı adlı ürün varsa önce o önerilir (yanlış eşleşmeyi önlemek için sadece tam eşleşme).
        Product sameName = products.stream()
                .filter(product -> normalize(product.getName()).equals(normalize(item.getItemName())))
                .findFirst().orElse(null);
        if (sameName != null) return "p:" + sameName.getId();
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

    private List<Product> productsOf(List<Category> categories) {
        return categories.isEmpty() ? List.of()
                : productRepository.findByCategoryIdIn(categories.stream().map(Category::getId).toList());
    }

    private static UUID parseId(String text) {
        try {
            return UUID.fromString(text);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Geçersiz hedef ürün");
        }
    }

    // Parçanın "ayrı alınırsa" fiyatı ürüne peşin fiyat notu olarak girer (mağaza: setin adı). Fiyatı olmayan
    // parçada sadece link taşınır. Aynı not ikinci kez eklenmez. Ürünün linki varsa dokunulmaz.
    private void attachPartToProduct(Product product, SetTemplateItem item, SetTemplate template) {
        if (product.getUrl() == null && item.getUrl() != null) {
            product.changeUrl(item.getUrl());
            productRepository.save(product);
        }
        if (item.getEstimatedSeparatePrice() == null) return;
        String note = "Setten ayrı alınırsa — " + template.getName()
                + (item.getQuantity() > 1 ? " (" + item.getQuantity() + " adet)" : "")
                + (item.getNote() == null || item.getNote().isBlank() ? "" : " · " + item.getNote().strip());
        boolean duplicate = priceEntryRepository.findByProductId(product.getId()).stream()
                .anyMatch(entry -> note.equals(entry.getPaymentPlanNote())
                        && template.getName().equals(entry.getStoreName())
                        && item.getEstimatedSeparatePrice().compareTo(
                                entry.getCashPrice() == null ? java.math.BigDecimal.valueOf(-1) : entry.getCashPrice()) == 0);
        if (duplicate) return;
        priceEntryRepository.save(new PriceEntry(product.getId(), template.getName(), PriceType.PESIN,
                item.getEstimatedSeparatePrice(), null, null, note, null,
                item.getUrl() != null ? item.getUrl() : template.getUrl()));
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
