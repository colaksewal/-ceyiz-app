package com.ceyiz.app.dto;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, UUID parentId) {

    public static CategoryResponse from (com.ceyiz.app.entity.Category category){
        return new CategoryResponse(category.getId(), category.getName(), category.getParentId());
    }

}
