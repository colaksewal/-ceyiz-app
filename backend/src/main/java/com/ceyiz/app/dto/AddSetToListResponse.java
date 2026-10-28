package com.ceyiz.app.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** newProductCount: yeni açılan ürün; existingProductCount: listede zaten olup sete bağlanan ürün. */
public record AddSetToListResponse(
        UUID id,
        String name,
        BigDecimal setPrice,
        int newProductCount,
        int existingProductCount
) {}
