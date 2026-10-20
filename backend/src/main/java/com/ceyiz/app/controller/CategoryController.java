package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CategoryResponse;
import com.ceyiz.app.dto.CreateCategoryRequest;
import com.ceyiz.app.dto.UpdateCategoryRequest;
import com.ceyiz.app.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping("/api/lists/{listId}/categories")
    public ResponseEntity<CategoryResponse> createCategory(
            @PathVariable UUID listId,
            @RequestBody CreateCategoryRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = categoryService.createCategory(listId, request.name(), requesterId);
        return ResponseEntity.ok(CategoryResponse.from(created));
    }

    @GetMapping("/api/lists/{listId}/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories(
            @PathVariable UUID listId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var categories = categoryService.getCategoriesForList(listId, requesterId).stream()
                .map(CategoryResponse::from)
                .toList();
        return ResponseEntity.ok(categories);
    }

    @PatchMapping("/api/categories/{categoryId}")
    public ResponseEntity<CategoryResponse> renameCategory(
            @PathVariable UUID categoryId,
            @RequestBody UpdateCategoryRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var updated = categoryService.renameCategory(categoryId, request.name(), requesterId);
        return ResponseEntity.ok(CategoryResponse.from(updated));
    }

    @DeleteMapping("/api/categories/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable UUID categoryId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        categoryService.deleteCategory(categoryId, requesterId);
        return ResponseEntity.noContent().build();
    }
}
