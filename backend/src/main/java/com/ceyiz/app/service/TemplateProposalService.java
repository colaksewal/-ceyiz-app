package com.ceyiz.app.service;

import com.ceyiz.app.dto.ProposalCategory;
import com.ceyiz.app.dto.ProposeTemplateRequest;
import com.ceyiz.app.dto.PublishProposalRequest;
import com.ceyiz.app.dto.PublishProposalResponse;
import com.ceyiz.app.dto.TemplateProposalResponse;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.CategoryTemplate;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductTemplate;
import com.ceyiz.app.entity.TemplateProposal;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.CategoryTemplateRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.ProductTemplateRepository;
import com.ceyiz.app.repository.TemplateProposalRepository;
import com.ceyiz.app.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Kullanıcının "listemi şablon olarak öner" akışı. Öneri, listenin gönderildiği andaki kopyasıdır (kategoriler,
 * alt kategoriler, ürün adları). Admin inceler, gerekirse düzenler ve yayınlar: öneri ortak şablonlara eklenir
 * (aynı adlı şablon varsa yeni ürünler ona katılır, olanlar tekrar eklenmez) ya da reddeder.
 */
@Service
@RequiredArgsConstructor
public class TemplateProposalService {

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final int MAX_PENDING_PER_USER = 5;
    private static final int MAX_NAME_LENGTH = 255;
    private static final int MAX_NOTE_LENGTH = 2000;

    private final TemplateProposalRepository proposalRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryTemplateRepository categoryTemplateRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final UserRepository userRepository;
    private final ListAccessService listAccessService;
    private final AdminAccessService adminAccessService;
    private final ObjectMapper objectMapper;

    @Transactional
    public TemplateProposalResponse propose(UUID userId, ProposeTemplateRequest request) {
        if (request.listId() == null) {
            throw new IllegalArgumentException("Liste seçilmeli");
        }
        listAccessService.requireAtLeastEditor(request.listId(), userId);

        String title = request.title() == null ? "" : request.title().strip();
        if (title.isEmpty() || title.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("Başlık boş olamaz ve en fazla " + MAX_NAME_LENGTH + " karakter olabilir");
        }
        String note = request.note() == null || request.note().isBlank() ? null : request.note().strip();
        if (note != null && note.length() > MAX_NOTE_LENGTH) {
            throw new IllegalArgumentException("Not en fazla " + MAX_NOTE_LENGTH + " karakter olabilir");
        }
        if (proposalRepository.countBySubmittedByAndStatus(userId, TemplateProposal.Status.PENDING) >= MAX_PENDING_PER_USER) {
            throw new IllegalArgumentException("En fazla " + MAX_PENDING_PER_USER
                    + " bekleyen öneriniz olabilir; admin inceleyince yenisini gönderebilirsiniz");
        }

        List<ProposalCategory> snapshot = snapshot(request.listId(), request.categories());
        if (snapshot.isEmpty()) {
            throw new IllegalArgumentException("Öneri için en az bir kategori seç");
        }
        TemplateProposal saved = proposalRepository.save(new TemplateProposal(userId, title, note, toJson(snapshot)));
        return toResponse(saved, namesOf(List.of(saved)));
    }

    public List<TemplateProposalResponse> myProposals(UUID userId) {
        List<TemplateProposal> proposals = proposalRepository.findBySubmittedByOrderByCreatedAtDesc(userId);
        Map<UUID, String> names = namesOf(proposals);
        return proposals.stream().map(proposal -> toResponse(proposal, names)).toList();
    }

    /** status: PENDING (varsayılan) ya da ALL. */
    public List<TemplateProposalResponse> adminList(UUID adminId, String status) {
        adminAccessService.requireAdmin(adminId);
        List<TemplateProposal> proposals = "ALL".equalsIgnoreCase(status)
                ? proposalRepository.findAllByOrderByCreatedAtDesc()
                : proposalRepository.findByStatusOrderByCreatedAtAsc(TemplateProposal.Status.PENDING);
        Map<UUID, String> names = namesOf(proposals);
        return proposals.stream().map(proposal -> toResponse(proposal, names)).toList();
    }

    public long pendingCount(UUID adminId) {
        adminAccessService.requireAdmin(adminId);
        return proposalRepository.countByStatus(TemplateProposal.Status.PENDING);
    }

    @Transactional
    public PublishProposalResponse publish(UUID adminId, UUID proposalId, PublishProposalRequest request) {
        adminAccessService.requireAdmin(adminId);
        TemplateProposal proposal = findPending(proposalId);

        List<ProposalCategory> categories = request != null && request.categories() != null
                ? request.categories() : fromJson(proposal.getContent());
        List<ProposalCategory> cleaned = clean(categories);
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("Yayınlanacak kategori yok");
        }

        // Ortak şablonlar (üst ve alt); aynı adlı şablon varsa ona eklenir.
        List<CategoryTemplate> templates = new ArrayList<>(categoryTemplateRepository.findAllByOrderByDisplayOrder());
        int nextOrder = templates.stream().mapToInt(CategoryTemplate::getDisplayOrder).max().orElse(0) + 1;
        int addedCategories = 0;
        int addedProducts = 0;

        for (ProposalCategory top : cleaned) {
            CategoryTemplate parent = findTemplate(templates, null, top.name());
            if (parent == null) {
                parent = categoryTemplateRepository.save(new CategoryTemplate(top.name(), nextOrder++, null));
                templates.add(parent);
                addedCategories++;
            }
            addedProducts += addProducts(parent, top.products());

            for (ProposalCategory child : top.children()) {
                CategoryTemplate childTemplate = findTemplate(templates, parent.getId(), child.name());
                if (childTemplate == null) {
                    childTemplate = categoryTemplateRepository.save(new CategoryTemplate(child.name(), nextOrder++, parent.getId()));
                    templates.add(childTemplate);
                    addedCategories++;
                }
                addedProducts += addProducts(childTemplate, child.products());
            }
        }
        proposal.publish();
        proposalRepository.save(proposal);
        return new PublishProposalResponse(addedCategories, addedProducts);
    }

    @Transactional
    public void reject(UUID adminId, UUID proposalId, String adminNote) {
        adminAccessService.requireAdmin(adminId);
        TemplateProposal proposal = findPending(proposalId);
        String note = adminNote == null || adminNote.isBlank() ? null : adminNote.strip();
        if (note != null && note.length() > MAX_NOTE_LENGTH) {
            throw new IllegalArgumentException("Not en fazla " + MAX_NOTE_LENGTH + " karakter olabilir");
        }
        proposal.reject(note);
        proposalRepository.save(proposal);
    }

    // ---------- yardımcılar ----------

    private TemplateProposal findPending(UUID proposalId) {
        TemplateProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new IllegalArgumentException("Öneri bulunamadı"));
        if (proposal.getStatus() != TemplateProposal.Status.PENDING) {
            throw new IllegalArgumentException("Bu öneri zaten değerlendirilmiş");
        }
        return proposal;
    }

    /**
     * Kullanıcının seçtiği kategorilerin şu anki hali: üst kategoriler, altlarında seçilen alt kategoriler. Seçimde
     * includeProducts kapalıysa kategorinin ürünleri gönderilmez (sadece adı). Bu listeye ait olmayan kategori kimlikleri
     * yok sayılır; alt kategori, üst kategorisi seçilmediyse öneriye girmez.
     */
    private List<ProposalCategory> snapshot(UUID listId, List<ProposeTemplateRequest.CategorySelection> selections) {
        List<Category> categories = categoryRepository.findByListId(listId);
        Map<UUID, Boolean> includeProducts = new HashMap<>();
        for (ProposeTemplateRequest.CategorySelection selection : selections == null
                ? List.<ProposeTemplateRequest.CategorySelection>of() : selections) {
            if (selection != null && selection.categoryId() != null) {
                includeProducts.put(selection.categoryId(), selection.includeProducts());
            }
        }
        Map<UUID, List<String>> namesByCategory = categories.isEmpty() ? Map.of()
                : productRepository.findByCategoryIdIn(categories.stream().map(Category::getId).toList()).stream()
                        .collect(Collectors.groupingBy(Product::getCategoryId,
                                Collectors.mapping(Product::getName, Collectors.toList())));

        List<ProposalCategory> result = new ArrayList<>();
        categories.stream()
                .filter(category -> category.getParentId() == null && includeProducts.containsKey(category.getId()))
                .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                .forEach(top -> {
                    List<ProposalCategory> children = categories.stream()
                            .filter(category -> top.getId().equals(category.getParentId())
                                    && includeProducts.containsKey(category.getId()))
                            .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
                            .map(child -> new ProposalCategory(child.getName(),
                                    productNames(namesByCategory, child, includeProducts), List.of()))
                            .toList();
                    result.add(new ProposalCategory(top.getName(), productNames(namesByCategory, top, includeProducts), children));
                });
        return result;
    }

    // Kategorinin ürün adları; "ürünleri paylaş" kapalıysa boş (sadece kategori adı gider).
    private static List<String> productNames(Map<UUID, List<String>> namesByCategory, Category category,
                                             Map<UUID, Boolean> includeProducts) {
        return Boolean.TRUE.equals(includeProducts.get(category.getId()))
                ? distinctNames(namesByCategory.getOrDefault(category.getId(), List.of())) : List.of();
    }

    // Kırpılır, boşlar atılır, büyük/küçük harf farkıyla tekrarlar tek kalır, Türkçe sıralanır.
    private static List<String> distinctNames(List<String> names) {
        Map<String, String> byKey = new LinkedHashMap<>();
        for (String name : names) {
            if (name == null || name.isBlank()) continue;
            byKey.putIfAbsent(normalize(name), name.strip());
        }
        return byKey.values().stream().sorted(java.text.Collator.getInstance(TR)).toList();
    }

    /** Admin'den gelen yapıyı doğrular ve temizler: adlar boş olamaz, tekrarlar atılır, alt kategorinin altına alt kategori yok. */
    private List<ProposalCategory> clean(List<ProposalCategory> categories) {
        List<ProposalCategory> result = new ArrayList<>();
        for (ProposalCategory top : categories) {
            if (top == null) continue;
            String name = cleanName(top.name());
            List<ProposalCategory> children = new ArrayList<>();
            for (ProposalCategory child : top.children() == null ? List.<ProposalCategory>of() : top.children()) {
                if (child == null) continue;
                children.add(new ProposalCategory(cleanName(child.name()), cleanProducts(child.products()), List.of()));
            }
            result.add(new ProposalCategory(name, cleanProducts(top.products()), children));
        }
        return result;
    }

    private static String cleanName(String name) {
        String cleaned = name == null ? "" : name.strip();
        if (cleaned.isEmpty() || cleaned.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("Kategori adı boş olamaz ve en fazla " + MAX_NAME_LENGTH + " karakter olabilir");
        }
        return cleaned;
    }

    private static List<String> cleanProducts(List<String> products) {
        Map<String, String> byKey = new LinkedHashMap<>();
        for (String product : products == null ? List.<String>of() : products) {
            if (product == null || product.isBlank()) continue;
            String name = product.strip();
            if (name.length() > MAX_NAME_LENGTH) {
                throw new IllegalArgumentException("Ürün adı en fazla " + MAX_NAME_LENGTH + " karakter olabilir");
            }
            byKey.putIfAbsent(normalize(name), name);
        }
        return new ArrayList<>(byKey.values());
    }

    private CategoryTemplate findTemplate(List<CategoryTemplate> templates, UUID parentId, String name) {
        return templates.stream()
                .filter(template -> Objects.equals(template.getParentId(), parentId))
                .filter(template -> normalize(template.getName()).equals(normalize(name)))
                .findFirst().orElse(null);
    }

    /** Şablona henüz olmayan ürünleri ekler; kaç tane eklendiğini döner. */
    private int addProducts(CategoryTemplate template, List<String> names) {
        List<ProductTemplate> existing = productTemplateRepository.findByCategoryTemplateIdOrderByDisplayOrder(template.getId());
        java.util.Set<String> known = existing.stream().map(product -> normalize(product.getName()))
                .collect(Collectors.toSet());
        int order = existing.stream().mapToInt(ProductTemplate::getDisplayOrder).max().orElse(0) + 1;
        int added = 0;
        for (String name : names) {
            if (!known.add(normalize(name))) continue;
            productTemplateRepository.save(new ProductTemplate(template.getId(), name, order++));
            added++;
        }
        return added;
    }

    private static int countProducts(List<ProposalCategory> categories) {
        int total = 0;
        for (ProposalCategory category : categories) {
            total += category.products() == null ? 0 : category.products().size();
            total += countProducts(category.children() == null ? List.of() : category.children());
        }
        return total;
    }

    private Map<UUID, String> namesOf(List<TemplateProposal> proposals) {
        List<UUID> ids = proposals.stream().map(TemplateProposal::getSubmittedBy).distinct().toList();
        Map<UUID, String> names = new HashMap<>();
        userRepository.findAllById(ids).forEach((User user) -> names.put(user.getId(), user.getName()));
        return names;
    }

    private TemplateProposalResponse toResponse(TemplateProposal proposal, Map<UUID, String> names) {
        List<ProposalCategory> categories = fromJson(proposal.getContent());
        return new TemplateProposalResponse(proposal.getId(), proposal.getTitle(), proposal.getNote(),
                proposal.getStatus().name(), proposal.getAdminNote(), names.getOrDefault(proposal.getSubmittedBy(), "?"),
                proposal.getCreatedAt(), proposal.getReviewedAt(), countProducts(categories), categories);
    }

    private String toJson(List<ProposalCategory> categories) {
        try {
            return objectMapper.writeValueAsString(categories);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Öneri kaydedilemedi", e);
        }
    }

    private List<ProposalCategory> fromJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<ProposalCategory>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Öneri içeriği okunamadı", e);
        }
    }

    private static String normalize(String name) {
        return name.strip().toLowerCase(TR);
    }
}
