package com.ceyiz.app.dto;

import com.ceyiz.app.entity.SetTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * totalPieceCount, individualTotal ve pricedItemCount DB'de saklanmıyor — parçalardan
 * her seferinde hesaplanıyor, böylece parça eklenip silindikçe tutarsız kalamıyorlar.
 * canDelete isteği yapan kullanıcıya göre hesaplanır (kendi seti ya da admin + admin seti).
 */
public record SetTemplateResponse(
        UUID id,
        String name,
        String brand,
        String imageUrl,
        int displayOrder,
        Instant createdAt,
        boolean createdByAdmin,
        boolean canDelete,
        int totalPieceCount,
        BigDecimal individualTotal,
        int pricedItemCount,
        List<SetTemplateItemResponse> items,
        List<SetTemplatePriceResponse> prices
) {

    public static SetTemplateResponse from(SetTemplate template,
                                           boolean canDelete,
                                           List<SetTemplateItemResponse> items,
                                           List<SetTemplatePriceResponse> prices) {
        int totalPieceCount = items.stream().mapToInt(SetTemplateItemResponse::quantity).sum();

        // Satır fiyatı o ürünün setten ayrı alınırsa tamamının fiyatı, adetle çarpılmaz. Sadece fiyatı
        // girilmiş satırlar toplanır; kaçının fiyatlı olduğu ayrıca döner ki arayüz "6 ürünün 5'i için
        // fiyat var" diyebilsin.
        List<SetTemplateItemResponse> pricedItems = items.stream()
                .filter(item -> item.estimatedSeparatePrice() != null)
                .toList();
        BigDecimal individualTotal = pricedItems.stream()
                .map(SetTemplateItemResponse::estimatedSeparatePrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new SetTemplateResponse(
                template.getId(),
                template.getName(),
                template.getBrand(),
                template.getImageUrl(),
                template.getDisplayOrder(),
                template.getCreatedAt(),
                template.isCreatedByAdmin(),
                canDelete,
                totalPieceCount,
                individualTotal,
                pricedItems.size(),
                items,
                prices
        );
    }
}
