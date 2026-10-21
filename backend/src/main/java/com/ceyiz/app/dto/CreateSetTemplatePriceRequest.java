package com.ceyiz.app.dto;

import com.ceyiz.app.entity.PriceType;

import java.math.BigDecimal;

public record CreateSetTemplatePriceRequest(
        String storeName,
        PriceType priceType,
        BigDecimal cashPrice,
        Integer installmentCount,
        BigDecimal installmentAmount,
        String paymentPlanNote
) {}
