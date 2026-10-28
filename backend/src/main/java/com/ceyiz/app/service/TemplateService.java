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

    public CategoryTemplateResponse createCategoryTemplate(UUID adminId, String name, int displayOrder) {
        adminAccessService.requireAdmin(adminId);
        CategoryTemplate saved = categoryTemplateRepository.save(new CategoryTemplate(name, displayOrder));
        return toResponse(saved);
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
