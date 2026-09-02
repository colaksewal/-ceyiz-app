package com.ceyiz.app.dto;

import com.ceyiz.app.repository.CategoryRepository;

import java.util.UUID;

public record CategoryResponse(UUID id, String name) {

    public static CategoryResponse from (com.ceyiz.app.entity.Category category){
        return new CategoryResponse(category.getId(), category.getName());
    }

}
