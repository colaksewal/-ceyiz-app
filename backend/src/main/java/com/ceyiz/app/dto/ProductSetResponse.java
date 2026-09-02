package com.ceyiz.app.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductSetResponse(
        UUID id,
        String name,
        String storeName,
        BigDecimal setPrice
) {
    public static ProductSetResponse from(com.ceyiz.app.entity.ProductSet set) {
        return new ProductSetResponse(set.getId(), set.getName(), set.getStoreName(), set.getSetPrice());
    }
}