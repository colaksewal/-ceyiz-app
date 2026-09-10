package com.ceyiz.app.dto;

import com.ceyiz.app.entity.CategoryTemplate;

import java.util.List;
import java.util.UUID;

public record CategoryTemplateResponse(UUID id, String name, int displayOrder, List<ProductTemplateResponse> products) {

    public static CategoryTemplateResponse from(CategoryTemplate category, List<ProductTemplateResponse> products) {
        return new CategoryTemplateResponse(category.getId(), category.getName(), category.getDisplayOrder(), products);
    }
}