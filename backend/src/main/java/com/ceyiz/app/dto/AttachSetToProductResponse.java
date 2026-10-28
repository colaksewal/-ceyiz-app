package com.ceyiz.app.dto;

import java.util.UUID;

public record AttachSetToProductResponse(UUID productId, String productName, int addedPriceCount) {}
