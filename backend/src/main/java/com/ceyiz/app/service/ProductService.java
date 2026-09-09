package com.ceyiz.app.service;

import com.ceyiz.app.entity.Product;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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




}
