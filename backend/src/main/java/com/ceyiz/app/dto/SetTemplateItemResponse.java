package com.ceyiz.app.dto;

import com.ceyiz.app.entity.SetTemplateItem;

import java.math.BigDecimal;
import java.util.UUID;

public record SetTemplateItemResponse(
        UUID id,
        String itemName,
        int quantity,
        int displayOrder,
        BigDecimal estimatedIndividualPrice,
        String note
) {

    public static SetTemplateItemResponse from(SetTemplateItem item) {
        return new SetTemplateItemResponse(
                item.getId(),
                item.getItemName(),
                item.getQuantity(),
                item.getDisplayOrder(),
                item.getEstimatedIndividualPrice(),
                item.getNote()
        );
    }
}
