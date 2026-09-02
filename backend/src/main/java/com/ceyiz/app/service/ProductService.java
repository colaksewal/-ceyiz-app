package com.ceyiz.app.service;

import com.ceyiz.app.entity.Product;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ListRepository;
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
    private final ListRepository listRepository;


    public Product createProduct(UUID categoryId, String name ,UUID requesterId){


        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        var list = listRepository.findById(category.getListId()).orElseThrow(() -> new IllegalArgumentException("Liste Bulunamadı!"));

        if(!list.getOwnerId().equals(requesterId)){
            throw new SecurityException("Bu kategoriye ürün ekleme yetkiniz yok");
        }

        Product product = new Product(categoryId, name);
        return productRepository.save(product);

    }

    public List<Product> getProductsForList(UUID categoryId, UUID requesterId){

        var category = categoryRepository.findById(categoryId).orElseThrow(()-> new IllegalArgumentException("Kategori Bulunamadı"));

        var list = listRepository.findById(category.getListId()).orElseThrow(() -> new IllegalArgumentException("Liste Bulunamadı!"));

        if(!list.getOwnerId().equals(requesterId)){
            throw new SecurityException("Bu kategoriye ürünleri görüntüleme yetkiniz yok");
        }

        return productRepository.findByCategoryId(categoryId);

    }




}
