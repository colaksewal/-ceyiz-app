package com.ceyiz.app.dto;

import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.SetTemplatePrice;

import java.math.BigDecimal;
import java.util.UUID;

public record SetTemplatePriceResponse(
        UUID id,
        String storeName,
        PriceType priceType,
        BigDecimal cashPrice,
        Integer installmentCount,
        BigDecimal installmentAmount,
        String paymentPlanNote,
        int displayOrder
) {

    public static SetTemplatePriceResponse from(SetTemplatePrice price) {
        return new SetTemplatePriceResponse(
                price.getId(),
                price.getStoreName(),
                price.getPriceType(),
                price.getCashPrice(),
                price.getInstallmentCount(),
                price.getInstallmentAmount(),
                price.getPaymentPlanNote(),
                price.getDisplayOrder()
        );
    }
}
