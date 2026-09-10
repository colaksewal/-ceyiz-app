package com.ceyiz.app.service;

import com.ceyiz.app.dto.CategoryTemplateResponse;
import com.ceyiz.app.dto.ProductTemplateResponse;
import com.ceyiz.app.entity.Category;
import com.ceyiz.app.entity.CategoryTemplate;
import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductTemplate;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.CategoryTemplateRepository;
import com.ceyiz.app.repository.ProductRepository;
import com.ceyiz.app.repository.ProductTemplateRepository;
import com.ceyiz.app.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public List<CategoryTemplateResponse> getAllTemplates(UUID adminId) {
        requireAdmin(adminId);
        return categoryTemplateRepository.findAllByOrderByDisplayOrder().stream()
                .map(this::toResponse)
                .toList();
    }

    public CategoryTemplateResponse createCategoryTemplate(UUID adminId, String name, int displayOrder) {
        requireAdmin(adminId);
        CategoryTemplate saved = categoryTemplateRepository.save(new CategoryTemplate(name, displayOrder));
        return toResponse(saved);
    }

    public void deleteCategoryTemplate(UUID adminId, UUID categoryTemplateId) {
        requireAdmin(adminId);
        categoryTemplateRepository.deleteById(categoryTemplateId);
    }

    public ProductTemplateResponse createProductTemplate(UUID adminId, UUID categoryTemplateId, String name, int displayOrder) {
        requireAdmin(adminId);
        ProductTemplate saved = productTemplateRepository.save(new ProductTemplate(categoryTemplateId, name, displayOrder));
        return ProductTemplateResponse.from(saved);
    }

    public void deleteProductTemplate(UUID adminId, UUID productTemplateId) {
        requireAdmin(adminId);
        productTemplateRepository.deleteById(productTemplateId);
    }

    @Transactional
    public void applyTemplatesToList(UUID listId) {
        for (CategoryTemplate categoryTemplate : categoryTemplateRepository.findAllByOrderByDisplayOrder()) {
            Category category = categoryRepository.save(new Category(listId, categoryTemplate.getName()));

            List<ProductTemplate> productTemplates =
                    productTemplateRepository.findByCategoryTemplateIdOrderByDisplayOrder(categoryTemplate.getId());
            for (ProductTemplate productTemplate : productTemplates) {
                productRepository.save(new Product(category.getId(), productTemplate.getName()));
            }
        }
    }

    private void requireAdmin(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
        if (!user.isAdmin()) {
            throw new SecurityException("Bu işlem için admin yetkisi gerekiyor");
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
