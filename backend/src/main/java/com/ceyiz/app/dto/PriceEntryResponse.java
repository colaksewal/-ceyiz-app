package com.ceyiz.app.dto;

import com.ceyiz.app.entity.PriceType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PriceEntryResponse(
        UUID id,
        UUID productId,
        String storeName,
        PriceType priceType,
        BigDecimal cashPrice,
        Integer installmentCount,
        BigDecimal installmentAmount,
        String paymentPlanNote,
        String photoUrl,
        Instant visitedAt,
        boolean isPreferred
) {
    public static PriceEntryResponse from(com.ceyiz.app.entity.PriceEntry p) {
        return new PriceEntryResponse(
                p.getId(), p.getProductId(), p.getStoreName(), p.getPriceType(),
                p.getCashPrice(), p.getInstallmentCount(), p.getInstallmentAmount(),
                p.getPaymentPlanNote(), p.getPhotoUrl(), p.getVisitedAt(), p.isPreferred()
        );
    }
}