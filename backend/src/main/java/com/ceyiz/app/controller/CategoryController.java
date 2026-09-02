package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CategoryResponse;
import com.ceyiz.app.dto.CreateCategoryRequest;
import com.ceyiz.app.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lists/{listId}/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @PathVariable UUID listId,
            @RequestBody CreateCategoryRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = categoryService.createCategory(listId, request.name(), requesterId);
        return ResponseEntity.ok(CategoryResponse.from(created));
    }

    @GetMapping
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
}