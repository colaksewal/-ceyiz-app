package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.dto.ApplyCategoryOrganizeRequest;
import com.ceyiz.app.dto.CategoryOrganizeResponse;
import com.ceyiz.app.dto.CategoryOrganizeResponse.Group;
import com.ceyiz.app.dto.CategoryOrganizeSuggestion;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.SetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Şişmiş bir kategoriyi alt kategorilere böler ve aynı ürünleri birleştirir. AI sadece öneri
 * üretir (hiçbir şey yazmaz); kullanıcı önizlemeyi onaylayınca apply ile uygulanır. Birebir aynı
 * adlı ürünler AI'ya sorulmadan kodla bulunur, AI sadece "farklı yazılmış aynı ürün"ü işaretler.
 */
@Service
@RequiredArgsConstructor
public class CategoryOrganizeService {

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final int MIN_PRODUCTS = 4;
    private static final int MAX_PRODUCTS = 150;
    private static final int MAX_GROUPS = 8;
    private static final int MIN_GROUP_SIZE = 2;
    private static final int MAX_NAME_LENGTH = 60;

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PriceEntryRepository priceEntryRepository;
    private final SetItemRepository setItemRepository;
    private final ListAccessService listAccessService;
    private final AiSuggestionService aiSuggestionService;
    private final AiJobService aiJobService;

    /** Arka planda çalışır, iş kimliği döner; sonuç CategoryOrganizeResponse. */
    public UUID requestOrganize(UUID categoryId, UUID requesterId) {
        Category category = findTopLevel(categoryId);
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        List<Product> products = productRepository.findByCategoryId(categoryId);
        if (products.size() < MIN_PRODUCTS) {
            throw new IllegalArgumentException("Düzenlemek için kategoride en az " + MIN_PRODUCTS + " ürün olmalı");
        }
        if (products.size() > MAX_PRODUCTS) {
            throw new IllegalArgumentException("Bir seferde en fazla " + MAX_PRODUCTS + " ürün düzenlenebilir");
        }

        boolean kitchen = KitchenGroups.isKitchen(category.getName());
        Map<String, List<Product>> byName = groupByName(products);
        String content = byName.values().stream().map(same -> same.get(0).getName()).collect(Collectors.joining("\n"));
        AiInput input = new AiInput(null, null, content);
        return aiJobService.submit(requesterId, AiLogService.KIND_ORGANIZE, input, () -> {
            // AI cevap veremese bile birebir aynı ürünler gösterilsin.
            CategoryOrganizeSuggestion suggestion = aiSuggestionService.organizeCategory(input, kitchen)
                    .orElse(new CategoryOrganizeSuggestion(List.of(), List.of()));
            List<Group> groups = kitchen ? buildKitchenGroups(byName, suggestion) : buildGroups(byName, suggestion);
            Set<UUID> placed = groups.stream().flatMap(group -> group.products().stream())
                    .map(CategoryOrganizeResponse.Product::id).collect(Collectors.toSet());
            List<CategoryOrganizeResponse.Product> ungrouped = products.stream()
                    .filter(product -> !placed.contains(product.getId()))
                    .map(product -> new CategoryOrganizeResponse.Product(product.getId(), product.getName()))
                    .toList();
            CategoryOrganizeResponse response = new CategoryOrganizeResponse(
                    groups, buildDuplicates(products, byName, suggestion), ungrouped);
            // Mutfak'ta AI hiçbir şey yerleştiremese bile sonuç dönülür: ürünler "Gruplanmamış" gelir ve
            // kullanıcı elle atar.
            return !kitchen && placed.isEmpty() && response.duplicates().isEmpty()
                    ? Optional.<CategoryOrganizeResponse>empty()
                    : Optional.of(response);
        });
    }

    @Transactional
    public void apply(UUID categoryId, ApplyCategoryOrganizeRequest request, UUID requesterId) {
        Category category = findTopLevel(categoryId);
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        Map<UUID, Product> own = productRepository.findByCategoryId(categoryId).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));

        Set<UUID> removed = new HashSet<>();
        for (var merge : request.merges() == null ? List.<ApplyCategoryOrganizeRequest.Merge>of() : request.merges()) {
            Product keep = own.get(merge.keepId());
            if (keep == null || removed.contains(keep.getId())) {
                throw new IllegalArgumentException("Birleştirilecek ürün bulunamadı");
            }
            List<Product> duplicates = new ArrayList<>();
            for (UUID id : merge.removeIds() == null ? List.<UUID>of() : merge.removeIds()) {
                Product duplicate = own.get(id);
                if (duplicate == null || id.equals(keep.getId()) || !removed.add(id)) {
                    throw new IllegalArgumentException("Birleştirilecek ürün bulunamadı");
                }
                duplicates.add(duplicate);
            }
            mergeInto(keep, duplicates);
        }

        Map<String, Category> children = categoryRepository.findByParentId(categoryId).stream()
                .collect(Collectors.toMap(child -> normalize(child.getName()), child -> child, (a, b) -> a));
        Set<UUID> moved = new HashSet<>();
        for (var group : request.groups() == null ? List.<ApplyCategoryOrganizeRequest.Group>of() : request.groups()) {
            String name = cleanName(group.name());
            if (name == null) continue;
            if (KitchenGroups.isKitchen(category.getName())) {
                // Mutfak'ta alt kategori sadece 8 standart gruptur; yazım standarda çevrilir.
                name = KitchenGroups.ALL.stream()
                        .filter(standard -> normalize(standard).equals(normalize(group.name())))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Mutfak'ta sadece standart gruplar kullanılabilir: " + group.name()));
            }
            String groupName = name;
            List<Product> toMove = (group.productIds() == null ? List.<UUID>of() : group.productIds()).stream()
                    .filter(id -> own.containsKey(id) && !removed.contains(id) && moved.add(id))
                    .map(own::get)
                    .toList();
            if (toMove.isEmpty()) continue;

            Category child = children.computeIfAbsent(normalize(groupName),
                    key -> categoryRepository.save(new Category(category.getListId(), categoryId, groupName)));
            toMove.forEach(product -> {
                product.moveTo(child.getId());
                productRepository.save(product);
            });
        }
    }

    // Fiyat notları ve set bağlantıları kalan ürüne taşınır; "bunu kullan" işareti tek kalır
    // (kalan ürünün kendisi varsa o, yoksa ilk bulunan).
    private void mergeInto(Product keep, List<Product> duplicates) {
        boolean keepHasPreferred = priceEntryRepository.findByProductIdAndIsPreferredTrue(keep.getId()).isPresent();
        for (Product duplicate : duplicates) {
            for (var entry : priceEntryRepository.findByProductId(duplicate.getId())) {
                if (entry.isPreferred()) {
                    if (keepHasPreferred) {
                        entry.unmarkAsPreferred();
                    } else {
                        keepHasPreferred = true;
                    }
                }
                entry.moveTo(keep.getId());
                priceEntryRepository.save(entry);
            }
            for (var item : setItemRepository.findByProductId(duplicate.getId())) {
                item.linkTo(keep.getId());
                setItemRepository.save(item);
            }
            if (duplicate.getStatus() == ProductStatus.PURCHASED) {
                keep.changeStatus(ProductStatus.PURCHASED);
            }
            productRepository.delete(duplicate);
        }
        productRepository.save(keep);
    }

    // Modelin yazdığı adlar girdidekilerle eşleşmeyebilir; eşleşmeyenler sessizce atlanır.
    private List<Group> buildGroups(Map<String, List<Product>> byName, CategoryOrganizeSuggestion suggestion) {
        Map<String, Group> groups = new LinkedHashMap<>();
        Set<UUID> assigned = new HashSet<>();
        for (var raw : suggestion.groups() == null ? List.<CategoryOrganizeSuggestion.Group>of() : suggestion.groups()) {
            String name = raw == null ? null : cleanName(raw.name());
            if (name == null || raw.items() == null) continue;

            List<CategoryOrganizeResponse.Product> members = new ArrayList<>();
            for (String itemName : raw.items()) {
                if (itemName == null) continue;
                for (Product product : byName.getOrDefault(normalize(itemName), List.of())) {
                    if (assigned.add(product.getId())) {
                        members.add(new CategoryOrganizeResponse.Product(product.getId(), product.getName()));
                    }
                }
            }
            if (members.isEmpty()) continue;
            groups.merge(normalize(name), new Group(name, members), (a, b) -> {
                List<CategoryOrganizeResponse.Product> all = new ArrayList<>(a.products());
                all.addAll(b.products());
                return new Group(a.name(), all);
            });
        }
        return groups.values().stream()
                .filter(group -> group.products().size() >= MIN_GROUP_SIZE)
                .limit(MAX_GROUPS)
                .toList();
    }

    /**
     * Mutfak: gruplar her zaman 8 standart gruptur (boş olanlar dahil, kullanıcı elle ürün atabilsin).
     * AI'nın yerleştirdiği ürünler korunur; AI'nın atladıkları anahtar kelime kurallarıyla (KitchenGroups)
     * yerleştirilir, hâlâ eşleşmeyenler gruplanmamış kalır. AI'nın uydurduğu grup adları atılır.
     */
    private List<Group> buildKitchenGroups(Map<String, List<Product>> byName, CategoryOrganizeSuggestion suggestion) {
        Map<String, List<CategoryOrganizeResponse.Product>> members = new LinkedHashMap<>();
        KitchenGroups.ALL.forEach(name -> members.put(name, new ArrayList<>()));
        Set<UUID> assigned = new HashSet<>();

        for (var raw : suggestion.groups() == null ? List.<CategoryOrganizeSuggestion.Group>of() : suggestion.groups()) {
            String standard = raw == null || raw.name() == null ? null : KitchenGroups.ALL.stream()
                    .filter(name -> normalize(name).equals(normalize(raw.name())))
                    .findFirst().orElse(null);
            if (standard == null || raw.items() == null) continue;
            for (String itemName : raw.items()) {
                if (itemName == null) continue;
                for (Product product : byName.getOrDefault(normalize(itemName), List.of())) {
                    if (assigned.add(product.getId())) {
                        members.get(standard).add(new CategoryOrganizeResponse.Product(product.getId(), product.getName()));
                    }
                }
            }
        }
        for (List<Product> same : byName.values()) {
            for (Product product : same) {
                if (assigned.contains(product.getId())) continue;
                KitchenGroups.classify(product.getName()).ifPresent(standard -> {
                    assigned.add(product.getId());
                    members.get(standard).add(new CategoryOrganizeResponse.Product(product.getId(), product.getName()));
                });
            }
        }
        return members.entrySet().stream().map(entry -> new Group(entry.getKey(), entry.getValue())).toList();
    }

    // Aynı adlı ürünler kesin tekrardır; AI'nın işaretlediği adlar da aynı kümeye katılır.
    private List<List<CategoryOrganizeResponse.Product>> buildDuplicates(
            List<Product> products, Map<String, List<Product>> byName, CategoryOrganizeSuggestion suggestion) {
        Map<UUID, UUID> root = new HashMap<>();
        products.forEach(product -> root.put(product.getId(), product.getId()));

        byName.values().forEach(same -> same.forEach(product -> union(root, same.get(0).getId(), product.getId())));
        for (List<String> names : suggestion.duplicates() == null ? List.<List<String>>of() : suggestion.duplicates()) {
            List<Product> matched = (names == null ? List.<String>of() : names).stream()
                    .filter(name -> name != null)
                    .flatMap(name -> byName.getOrDefault(normalize(name), List.of()).stream())
                    .toList();
            matched.forEach(product -> union(root, matched.get(0).getId(), product.getId()));
        }

        Map<UUID, List<CategoryOrganizeResponse.Product>> clusters = new LinkedHashMap<>();
        for (Product product : products) {
            clusters.computeIfAbsent(find(root, product.getId()), key -> new ArrayList<>())
                    .add(new CategoryOrganizeResponse.Product(product.getId(), product.getName()));
        }
        return clusters.values().stream().filter(cluster -> cluster.size() > 1).toList();
    }

    private static UUID find(Map<UUID, UUID> root, UUID id) {
        UUID current = id;
        while (!root.get(current).equals(current)) {
            current = root.get(current);
        }
        return current;
    }

    private static void union(Map<UUID, UUID> root, UUID a, UUID b) {
        root.put(find(root, a), find(root, b));
    }

    private Category findTopLevel(UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        if (category.getParentId() != null) {
            throw new IllegalArgumentException("Alt kategori yeniden düzenlenemez");
        }
        return category;
    }

    private static Map<String, List<Product>> groupByName(List<Product> products) {
        Map<String, List<Product>> byName = new LinkedHashMap<>();
        products.forEach(product -> byName.computeIfAbsent(normalize(product.getName()), key -> new ArrayList<>()).add(product));
        return byName;
    }

    private static String cleanName(String name) {
        if (name == null) return null;
        String cleaned = name.strip().replaceAll("\\s+", " ");
        return cleaned.isEmpty() || cleaned.length() > MAX_NAME_LENGTH ? null : cleaned;
    }

    private static String normalize(String name) {
        return name.strip().replaceAll("\\s+", " ").toLowerCase(TR);
    }
}
