package com.ceyiz.app.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateSetItemRequest(
        UUID productId,
        String itemName,
        int quantity,
        BigDecimal estimatedIndividualPrice
) {}