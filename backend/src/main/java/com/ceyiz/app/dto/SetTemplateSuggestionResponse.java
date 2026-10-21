package com.ceyiz.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

/**
 * AI'nın fotoğraf/PDF'den çıkardığı set önerisi — hiçbir şey kaydedilmez, admin formda
 * kontrol edip CreateSetTemplateRequest olarak ayrıca gönderir. priceType String tutulur:
 * model geçersiz bir değer uydurursa tüm yanıt parse hatasına düşmesin, servis o satırı eler.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SetTemplateSuggestionResponse(
        String name,
        String brand,
        List<Item> items,
        List<Price> prices
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(String itemName, Integer quantity, BigDecimal estimatedSeparatePrice) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Price(String priceType, BigDecimal cashPrice, Integer installmentCount, BigDecimal installmentAmount) {}
}
