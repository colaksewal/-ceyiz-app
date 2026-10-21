package com.ceyiz.app.dto;

import java.util.List;

public record CreateSetTemplateRequest(
        String name,
        String brand,
        int displayOrder,
        List<CreateSetTemplateItemRequest> items,
        List<CreateSetTemplatePriceRequest> prices
) {}
