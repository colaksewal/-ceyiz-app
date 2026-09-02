package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CreateProductSetRequest;
import com.ceyiz.app.dto.ProductSetResponse;
import com.ceyiz.app.dto.SetComparisonResult;
import com.ceyiz.app.service.ProductSetService;
import com.ceyiz.app.service.SetComparisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ProductSetController {

    private final ProductSetService productSetService;
    private final SetComparisonService setComparisonService;

    @PostMapping("/api/lists/{listId}/sets")
    public ResponseEntity<ProductSetResponse> createSet(
            @PathVariable UUID listId,
            @RequestBody CreateProductSetRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = productSetService.createSet(listId, request, requesterId);
        return ResponseEntity.ok(ProductSetResponse.from(created));
    }

    @GetMapping("/api/lists/{listId}/sets")
    public ResponseEntity<List<ProductSetResponse>> getSets(
            @PathVariable UUID listId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var sets = productSetService.getSetsForList(listId, requesterId).stream()
                .map(ProductSetResponse::from)
                .toList();
        return ResponseEntity.ok(sets);
    }

    @GetMapping("/api/sets/{setId}/comparison")
    public ResponseEntity<SetComparisonResult> compareSet(@PathVariable UUID setId) {
        return ResponseEntity.ok(setComparisonService.compare(setId));
    }
}