package com.ceyiz.app.service;

import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.CategoryTemplate;
import com.ceyiz.app.entity.ProductTemplate;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.CategoryTemplateRepository;
import com.ceyiz.app.repository.ProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Bir kategorinin alt kategorileri (ör. Mutfak: Pişirme, Küçük Ev Aletleri...) ADMİN'in şablonlarında tanımlanır:
 * aynı adlı üst kategori şablonunun alt şablonları. Kullanıcılar kendi alt kategorilerini açamaz; AI da ürünleri
 * sadece bu tanımlı alt kategorilere (şablon ürünlerini örnek alarak) sınıflandırır.
 */
@Service
@RequiredArgsConstructor
public class TemplateGroupService {

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final int MAX_EXAMPLES = 10;

    /** name: alt kategori adı; examples: şablondaki örnek ürünler (AI'ya ipucu). */
    public record Group(String name, List<String> examples) {}

    private final CategoryTemplateRepository categoryTemplateRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;

    /** Adı categoryName olan üst kategorinin admin tarafından tanımlı alt kategorileri (sıralı); yoksa boş. */
    public List<Group> groupsFor(String categoryName) {
        if (categoryName == null) return List.of();
        List<CategoryTemplate> templates = categoryTemplateRepository.findAllByOrderByDisplayOrder();
        CategoryTemplate parent = templates.stream()
                .filter(template -> template.getParentId() == null && normalize(template.getName()).equals(normalize(categoryName)))
                .findFirst().orElse(null);
        if (parent == null) return List.of();

        Map<UUID, List<String>> productsByTemplate = productTemplateRepository.findAllByOrderByDisplayOrder().stream()
                .collect(Collectors.groupingBy(ProductTemplate::getCategoryTemplateId,
                        Collectors.mapping(ProductTemplate::getName, Collectors.toList())));
        return templates.stream()
                .filter(template -> parent.getId().equals(template.getParentId()))
                .map(child -> new Group(child.getName(),
                        productsByTemplate.getOrDefault(child.getId(), List.of()).stream().limit(MAX_EXAMPLES).toList()))
                .toList();
    }

    public List<String> groupNames(String categoryName) {
        return groupsFor(categoryName).stream().map(Group::name).toList();
    }

    /** Tüm üst kategori şablonlarının alt kategori adları: normalize edilmiş üst ad -> alt adlar (kategori listesi için). */
    public Map<String, List<String>> allGroupNames() {
        List<CategoryTemplate> templates = categoryTemplateRepository.findAllByOrderByDisplayOrder();
        Map<UUID, String> topNames = new HashMap<>();
        templates.stream().filter(template -> template.getParentId() == null)
                .forEach(template -> topNames.put(template.getId(), normalize(template.getName())));
        Map<String, List<String>> result = new LinkedHashMap<>();
        templates.stream().filter(template -> template.getParentId() != null && topNames.containsKey(template.getParentId()))
                .forEach(child -> result.computeIfAbsent(topNames.get(child.getParentId()), key -> new ArrayList<>())
                        .add(child.getName()));
        return result;
    }

    public static String normalizeName(String name) {
        return normalize(name);
    }

    /** Kullanıcının yazdığı adı admin'in tanımladığı yazıma çevirir; tanımlı değilse boş. */
    public Optional<String> canonical(String categoryName, String name) {
        if (name == null) return Optional.empty();
        return groupNames(categoryName).stream()
                .filter(defined -> normalize(defined).equals(normalize(name)))
                .findFirst();
    }

    /**
     * Kategorinin admin tanımlı alt kategorileri; kategori yoksa, üst kategori değilse ya da alt kategori tanımlı değilse
     * boş (AI normal çalışır). Kategoriye erişim kontrol edilir.
     */
    public List<Group> groupsForCategory(UUID categoryId, UUID requesterId) {
        Category category = categoryRepository.findById(categoryId).orElse(null);
        if (category == null) return List.of();
        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);
        return category.getParentId() != null ? List.of() : groupsFor(category.getName());
    }

    /** "- Pişirme (örnek: tencere, tava)" satırları. */
    public static String toPromptText(List<Group> groups) {
        return groups.stream()
                .map(group -> "- " + group.name()
                        + (group.examples().isEmpty() ? "" : " (örnek: " + String.join(", ", group.examples()) + ")"))
                .collect(Collectors.joining("\n"));
    }

    private static String normalize(String name) {
        return name.strip().toLowerCase(TR);
    }
}
