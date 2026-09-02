package com.ceyiz.app.dto;

import java.math.BigDecimal;

public record SetComparisonResult(
        BigDecimal setPrice,
        BigDecimal individualTotal,
        BigDecimal savingsAmount,
        int missingItemsCount
) {}