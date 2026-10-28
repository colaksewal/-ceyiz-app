package com.ceyiz.app.dto;

import java.util.UUID;

public record CreateCategoryRequest ( String name, UUID parentId ){ }
