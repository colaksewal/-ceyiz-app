package com.ceyiz.app.service;

import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;


    public Product createProduct(UUID categoryId, String name ,UUID requesterId){


        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        Product product = new Product(categoryId, name);
        return productRepository.save(product);

    }

    public List<Product> getProductsForList(UUID categoryId, UUID requesterId){

        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);

        return productRepository.findByCategoryId(categoryId);

    }

    public Product updateProduct(UUID productId, String name, ProductStatus status, UUID categoryId, UUID requesterId){

        if (name != null && name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ürün adı boş olamaz");
        }

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        if (name != null) product.rename(name.trim());
        if (status != null) product.changeStatus(status);
        if (categoryId != null && !categoryId.equals(product.getCategoryId())) {
            requireSameCategoryFamily(product, categoryId);
            product.moveTo(categoryId);
        }
        return productRepository.save(product);
    }

    // Fiyat notları ON DELETE CASCADE ile silinir, set kalemleri ise ON DELETE SET NULL ile
    // serbest metin kalemine dönüşür.
    public void deleteProduct(UUID productId, UUID requesterId){

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        productRepository.delete(product);
    }

    // Elle taşıma sadece aynı listede, aynı üst kategorinin kendisi ile alt kategorileri arasında olur.
    private void requireSameCategoryFamily(Product product, UUID targetId){
        var current = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        var target = categoryRepository.findById(targetId)
                .orElseThrow(() -> new IllegalArgumentException("Hedef kategori bulunamadı"));
        if (!familyRoot(current).equals(familyRoot(target)) || !current.getListId().equals(target.getListId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ürün sadece aynı kategorinin alt kategorileri arasında taşınabilir");
        }
    }

    private static UUID familyRoot(com.ceyiz.app.entity.Category category){
        return category.getParentId() != null ? category.getParentId() : category.getId();
    }

    private Product findProduct(UUID productId){
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
    }

    private void requireEditorForProduct(Product product, UUID requesterId){
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);
    }




}
