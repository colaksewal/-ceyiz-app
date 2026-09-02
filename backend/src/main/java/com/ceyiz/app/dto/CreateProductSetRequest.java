package com.ceyiz.app.dto;

import java.math.BigDecimal;
import java.util.List;

public record CreateProductSetRequest(
        String name,
        String storeName,
        BigDecimal setPrice,
        List<CreateSetItemRequest> items
) {}