package com.ceyiz.app.dto;

import com.ceyiz.app.entity.PriceType;

import java.math.BigDecimal;

/** Fiyat notunun tamamı yeniden yazılır (formdaki tüm alanlar gönderilir). Boş link linki kaldırır. */
public record UpdatePriceEntryRequest(
        String storeName,
        PriceType priceType,
        BigDecimal cashPrice,
        Integer installmentCount,
        BigDecimal installmentAmount,
        String paymentPlanNote,
        String url
) {}
