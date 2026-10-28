package com.ceyiz.app.controller;


import com.ceyiz.app.dto.CreateProductRequest;
import com.ceyiz.app.dto.ProductResponse;
import com.ceyiz.app.dto.UpdateProductRequest;
import com.ceyiz.app.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping("/api/categories/{categoryId}/products")
    public ResponseEntity<ProductResponse> createProduct(
            @PathVariable UUID categoryId,
            @RequestBody CreateProductRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = productService.createProduct(categoryId, request.name(), requesterId);
        return ResponseEntity.ok(productService.toResponse(created));
    }

    @GetMapping("/api/categories/{categoryId}/products")
    public ResponseEntity<List<ProductResponse>> getProducts(
            @PathVariable UUID categoryId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var products = productService.getProductsForList(categoryId, requesterId).stream()
                .toList();
        return ResponseEntity.ok(productService.toResponses(products));
    }

    @PatchMapping("/api/products/{productId}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable UUID productId,
            @RequestBody UpdateProductRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var updated = productService.updateProduct(productId, request.name(), request.status(), request.categoryId(), request.url(), requesterId);
        return ResponseEntity.ok(productService.toResponse(updated));
    }

    @DeleteMapping("/api/products/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable UUID productId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        productService.deleteProduct(productId, requesterId);
        return ResponseEntity.noContent().build();
    }

}
