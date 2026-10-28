package com.ceyiz.app.service;

import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;


    // Mutfak kategorisinde grup verilmezse ürün adından otomatik bulunur; bulunamazsa grupsuz kalır.
    public Product createProduct(UUID categoryId, String name, String group, UUID requesterId){


        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        String resolvedGroup = normalizeGroup(group);
        if (resolvedGroup == null && KitchenGroups.isKitchen(category.getName())) {
            resolvedGroup = KitchenGroups.classify(name).orElse(null);
        }
        Product product = new Product(categoryId, name, resolvedGroup);
        return productRepository.save(product);

    }

    @Transactional
    public List<Product> autoGroup(UUID categoryId, UUID requesterId){

        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        if (!KitchenGroups.isKitchen(category.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Otomatik gruplama sadece Mutfak kategorisinde var");
        }

        var products = productRepository.findByCategoryId(categoryId);
        for (Product product : products) {
            if (product.getGroup() == null) {
                KitchenGroups.classify(product.getName()).ifPresent(product::changeGroup);
            }
        }
        return productRepository.saveAll(products);
    }

    public List<Product> getProductsForList(UUID categoryId, UUID requesterId){

        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);

        return productRepository.findByCategoryId(categoryId);

    }

    public Product updateProduct(UUID productId, String name, ProductStatus status, String group, UUID requesterId){

        if (name != null && name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ürün adı boş olamaz");
        }

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        if (name != null) product.rename(name.trim());
        if (status != null) product.changeStatus(status);
        if (group != null) product.changeGroup(normalizeGroup(group));
        return productRepository.save(product);
    }

    // Fiyat notları ON DELETE CASCADE ile silinir, set kalemleri ise ON DELETE SET NULL ile
    // serbest metin kalemine dönüşür.
    public void deleteProduct(UUID productId, UUID requesterId){

        var product = findProduct(productId);
        requireEditorForProduct(product, requesterId);

        productRepository.delete(product);
    }

    // Boş string = grubu kaldır (null). Dolu ise standart listeden olmalı.
    private static String normalizeGroup(String group){
        if (group == null || group.isBlank()) return null;
        String trimmed = group.trim();
        if (!KitchenGroups.isValid(trimmed)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz ürün grubu: " + trimmed);
        }
        return trimmed;
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
