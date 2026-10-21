package com.ceyiz.app.dto;

import com.ceyiz.app.entity.SetTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * totalPieceCount, individualTotal ve pricedItemCount DB'de saklanmıyor — parçalardan
 * her seferinde hesaplanıyor, böylece parça eklenip silindikçe tutarsız kalamıyorlar.
 */
public record SetTemplateResponse(
        UUID id,
        String name,
        String brand,
        int displayOrder,
        Instant createdAt,
        int totalPieceCount,
        BigDecimal individualTotal,
        int pricedItemCount,
        List<SetTemplateItemResponse> items,
        List<SetTemplatePriceResponse> prices
) {

    public static SetTemplateResponse from(SetTemplate template,
                                           List<SetTemplateItemResponse> items,
                                           List<SetTemplatePriceResponse> prices) {
        int totalPieceCount = items.stream().mapToInt(SetTemplateItemResponse::quantity).sum();

        // Sadece fiyatı girilmiş parçalar toplanır; kaç tanesinin fiyatlı olduğu ayrıca
        // döndürülür ki arayüz "64 parçanın 58'i için fiyat var" diyebilsin.
        List<SetTemplateItemResponse> pricedItems = items.stream()
                .filter(item -> item.estimatedIndividualPrice() != null)
                .toList();
        BigDecimal individualTotal = pricedItems.stream()
                .map(item -> item.estimatedIndividualPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new SetTemplateResponse(
                template.getId(),
                template.getName(),
                template.getBrand(),
                template.getDisplayOrder(),
                template.getCreatedAt(),
                totalPieceCount,
                individualTotal,
                pricedItems.size(),
                items,
                prices
        );
    }
}
