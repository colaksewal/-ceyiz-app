package com.ceyiz.app.controller;

import com.ceyiz.app.dto.AiJobStartedResponse;
import com.ceyiz.app.dto.ApplyCategoryOrganizeRequest;
import com.ceyiz.app.dto.CategoryResponse;
import com.ceyiz.app.dto.CreateCategoryRequest;
import com.ceyiz.app.dto.UpdateCategoryRequest;
import com.ceyiz.app.service.CategoryOrganizeService;
import com.ceyiz.app.service.CategoryService;
import com.ceyiz.app.service.TemplateGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final TemplateGroupService templateGroupService;
    private final CategoryOrganizeService categoryOrganizeService;

    @PostMapping("/api/lists/{listId}/categories")
    public ResponseEntity<CategoryResponse> createCategory(
            @PathVariable UUID listId,
            @RequestBody CreateCategoryRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = categoryService.createCategory(listId, request.name(), request.parentId(), requesterId);
        return ResponseEntity.ok(CategoryResponse.from(created));
    }

    @GetMapping("/api/lists/{listId}/categories")
    public ResponseEntity<List<CategoryResponse>> getCategories(
            @PathVariable UUID listId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var found = categoryService.getCategoriesForList(listId, requesterId);
        var counts = categoryService.productCounts(found);
        var groups = templateGroupService.allGroupNames();
        var categories = found.stream()
                .map(category -> {
                    int[] count = counts.getOrDefault(category.getId(), new int[]{0, 0});
                    var groupNames = category.getParentId() != null ? java.util.List.<String>of()
                            : groups.getOrDefault(TemplateGroupService.normalizeName(category.getName()), java.util.List.of());
                    return CategoryResponse.from(category, count[0], count[1], groupNames);
                })
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

    // Arka planda çalışır (GET /api/ai/jobs/{jobId}); hiçbir şey yazmaz, sadece öneri üretir.
    @PostMapping("/api/categories/{categoryId}/ai-organize")
    public ResponseEntity<AiJobStartedResponse> aiOrganize(
            @PathVariable UUID categoryId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        UUID jobId = categoryOrganizeService.requestOrganize(categoryId, requesterId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new AiJobStartedResponse(jobId));
    }

    @PostMapping("/api/categories/{categoryId}/organize")
    public ResponseEntity<Void> organize(
            @PathVariable UUID categoryId,
            @RequestBody ApplyCategoryOrganizeRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        categoryOrganizeService.apply(categoryId, request, requesterId);
        return ResponseEntity.noContent().build();
    }
}
