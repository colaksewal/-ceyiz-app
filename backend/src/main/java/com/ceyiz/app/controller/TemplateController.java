package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CategoryTemplateResponse;
import com.ceyiz.app.dto.CreateCategoryTemplateRequest;
import com.ceyiz.app.dto.CreateProductTemplateRequest;
import com.ceyiz.app.dto.ProductTemplateResponse;
import com.ceyiz.app.service.TemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/templates")
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public ResponseEntity<List<CategoryTemplateResponse>> getAllTemplates(Authentication authentication) {
        UUID adminId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(templateService.getAllTemplates(adminId));
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryTemplateResponse> createCategoryTemplate(
            @RequestBody CreateCategoryTemplateRequest request,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(templateService.createCategoryTemplate(adminId, request.name(), request.displayOrder()));
    }

    @DeleteMapping("/categories/{categoryTemplateId}")
    public ResponseEntity<Void> deleteCategoryTemplate(
            @PathVariable UUID categoryTemplateId,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        templateService.deleteCategoryTemplate(adminId, categoryTemplateId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/categories/{categoryTemplateId}/products")
    public ResponseEntity<ProductTemplateResponse> createProductTemplate(
            @PathVariable UUID categoryTemplateId,
            @RequestBody CreateProductTemplateRequest request,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(
                templateService.createProductTemplate(adminId, categoryTemplateId, request.name(), request.displayOrder())
        );
    }

    @DeleteMapping("/products/{productTemplateId}")
    public ResponseEntity<Void> deleteProductTemplate(
            @PathVariable UUID productTemplateId,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        templateService.deleteProductTemplate(adminId, productTemplateId);
        return ResponseEntity.noContent().build();
    }
}
