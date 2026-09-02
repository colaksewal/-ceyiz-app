package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CreatePriceEntryRequest;
import com.ceyiz.app.dto.PriceEntryResponse;
import com.ceyiz.app.service.PriceEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PriceEntryController {

    private final PriceEntryService priceEntryService;

    @PostMapping("/api/products/{productId}/price-entries")
    public ResponseEntity<PriceEntryResponse> createPriceEntry(
            @PathVariable UUID productId,
            @RequestBody CreatePriceEntryRequest request,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var created = priceEntryService.createPriceEntry(
                productId, request.storeName(), request.priceType(), request.cashPrice(),
                request.installmentCount(), request.installmentAmount(),
                request.paymentPlanNote(), request.photoUrl(), requesterId
        );
        return ResponseEntity.ok(PriceEntryResponse.from(created));
    }

    @GetMapping("/api/products/{productId}/price-entries")
    public ResponseEntity<List<PriceEntryResponse>> getPriceEntries(
            @PathVariable UUID productId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var entries = priceEntryService.getPriceEntriesForProduct(productId, requesterId).stream()
                .map(PriceEntryResponse::from)
                .toList();
        return ResponseEntity.ok(entries);
    }

    @PatchMapping("/api/price-entries/{priceEntryId}/preferred")
    public ResponseEntity<PriceEntryResponse> markAsPreferred(
            @PathVariable UUID priceEntryId,
            Authentication authentication
    ) {
        UUID requesterId = UUID.fromString(authentication.getName());
        var updated = priceEntryService.markAsPreferred(priceEntryId, requesterId);
        return ResponseEntity.ok(PriceEntryResponse.from(updated));
    }
}