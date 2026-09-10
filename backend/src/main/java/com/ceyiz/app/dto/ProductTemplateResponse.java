package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ProductTemplate;

import java.util.UUID;

public record ProductTemplateResponse(UUID id, String name, int displayOrder) {

    public static ProductTemplateResponse from(ProductTemplate template) {
        return new ProductTemplateResponse(template.getId(), template.getName(), template.getDisplayOrder());
    }
}