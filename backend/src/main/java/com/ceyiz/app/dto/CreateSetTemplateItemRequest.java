package com.ceyiz.app.dto;

import java.math.BigDecimal;

public record CreateSetTemplateItemRequest(
        String itemName,
        int quantity,
        BigDecimal estimatedSeparatePrice,
        String note,
        String url
) {}
