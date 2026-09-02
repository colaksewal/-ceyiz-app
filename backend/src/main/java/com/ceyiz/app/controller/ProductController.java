package com.ceyiz.app.controller;


import com.ceyiz.app.dto.CategoryResponse;
import com.ceyiz.app.dto.CreateProductRequest;
import com.ceyiz.app.dto.ProductResponse;
import com.ceyiz.app.service.CategoryService;
import com.ceyiz.app.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories/{categoryId}/products")
@RequiredArgsConstructor

public class ProductController {

    private final ProductService productService;

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @PathVariable UUID categoryId,
            @RequestBody CreateProductRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = productService.createProduct(categoryId, request.name(), requesterId);
        return ResponseEntity.ok(ProductResponse.from(created));
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getProducts(
            @PathVariable UUID categoryId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var products = productService.getProductsForList(categoryId, requesterId).stream()
                .map(ProductResponse::from)
                .toList();
        return ResponseEntity.ok(products);
    }



}
