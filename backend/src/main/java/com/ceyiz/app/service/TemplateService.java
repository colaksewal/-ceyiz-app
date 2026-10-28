package com.ceyiz.app.service;

import com.ceyiz.app.dto.CategoryTemplateResponse;
import com.ceyiz.app.dto.ProductTemplateResponse;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.CategoryTemplate;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductTemplate;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.CategoryTemplateRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.ProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final CategoryTemplateRepository categoryTemplateRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final AdminAccessService adminAccessService;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ListAccessService listAccessService;

    public List<CategoryTemplateResponse> getAllTemplates() {
        return categoryTemplateRepository.findAllByOrderByDisplayOrder().stream()
                .map(this::toResponse)
                .toList();
    }

    public CategoryTemplateResponse createCategoryTemplate(UUID adminId, String name, int displayOrder, UUID parentId) {
        adminAccessService.requireAdmin(adminId);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Kategori adı boş olamaz");
        }
        if (parentId != null) {
            CategoryTemplate parent = categoryTemplateRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Üst kategori şablonu bulunamadı"));
            if (parent.getParentId() != null) {
                throw new IllegalArgumentException("Alt kategorinin altına kategori eklenemez");
            }
        }
        CategoryTemplate saved = categoryTemplateRepository.save(new CategoryTemplate(name.strip(), displayOrder, parentId));
        return toResponse(saved);
    }

    /** Ürün şablonunu aynı ailedeki (üst şablon ve alt şablonları) başka bir şablona taşır; hedefin sonuna eklenir. */
    @Transactional
    public ProductTemplateResponse moveProductTemplate(UUID adminId, UUID productTemplateId, UUID targetCategoryTemplateId) {
        adminAccessService.requireAdmin(adminId);
        ProductTemplate product = productTemplateRepository.findById(productTemplateId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün şablonu bulunamadı"));
        CategoryTemplate current = categoryTemplateRepository.findById(product.getCategoryTemplateId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori şablonu bulunamadı"));
        CategoryTemplate target = categoryTemplateRepository.findById(targetCategoryTemplateId)
                .orElseThrow(() -> new IllegalArgumentException("Hedef kategori şablonu bulunamadı"));
        UUID currentRoot = current.getParentId() != null ? current.getParentId() : current.getId();
        UUID targetRoot = target.getParentId() != null ? target.getParentId() : target.getId();
        if (!currentRoot.equals(targetRoot)) {
            throw new IllegalArgumentException("Ürün sadece aynı kategorinin alt kategorileri arasında taşınabilir");
        }
        int nextOrder = productTemplateRepository.findByCategoryTemplateIdOrderByDisplayOrder(target.getId()).stream()
                .mapToInt(ProductTemplate::getDisplayOrder).max().orElse(0) + 1;
        product.moveTo(target.getId(), nextOrder);
        return ProductTemplateResponse.from(productTemplateRepository.save(product));
    }

    public void deleteCategoryTemplate(UUID adminId, UUID categoryTemplateId) {
        adminAccessService.requireAdmin(adminId);
        categoryTemplateRepository.deleteById(categoryTemplateId);
    }

    public ProductTemplateResponse createProductTemplate(UUID adminId, UUID categoryTemplateId, String name, int displayOrder) {
        adminAccessService.requireAdmin(adminId);
        ProductTemplate saved = productTemplateRepository.save(new ProductTemplate(categoryTemplateId, name, displayOrder));
        return ProductTemplateResponse.from(saved);
    }

    public void deleteProductTemplate(UUID adminId, UUID productTemplateId) {
        adminAccessService.requireAdmin(adminId);
        productTemplateRepository.deleteById(productTemplateId);
    }

    @Transactional
    public void applyTemplatesToList(UUID listId, UUID requesterId) {
        listAccessService.requireAtLeastEditor(listId, requesterId);

        // Önce üst şablonlar, sonra alt şablonlar (alt kategori üst kategorinin altına açılır).
        List<CategoryTemplate> all = categoryTemplateRepository.findAllByOrderByDisplayOrder();
        java.util.Map<UUID, Category> created = new java.util.HashMap<>();
        for (CategoryTemplate categoryTemplate : all) {
            if (categoryTemplate.getParentId() != null) continue;
            Category category = categoryRepository.save(new Category(listId, categoryTemplate.getName()));
            created.put(categoryTemplate.getId(), category);
            addProducts(categoryTemplate, category);
        }
        for (CategoryTemplate categoryTemplate : all) {
            if (categoryTemplate.getParentId() == null) continue;
            Category parent = created.get(categoryTemplate.getParentId());
            if (parent == null) continue;
            Category category = categoryRepository.save(new Category(listId, parent.getId(), categoryTemplate.getName()));
            addProducts(categoryTemplate, category);
        }
    }

    private void addProducts(CategoryTemplate categoryTemplate, Category category) {
        for (ProductTemplate productTemplate :
                productTemplateRepository.findByCategoryTemplateIdOrderByDisplayOrder(categoryTemplate.getId())) {
            productRepository.save(new Product(category.getId(), productTemplate.getName()));
        }
    }

    private CategoryTemplateResponse toResponse(CategoryTemplate categoryTemplate) {
        List<ProductTemplateResponse> products =
                productTemplateRepository.findByCategoryTemplateIdOrderByDisplayOrder(categoryTemplate.getId()).stream()
                        .map(ProductTemplateResponse::from)
                        .toList();
        return CategoryTemplateResponse.from(categoryTemplate, products);
    }
}
