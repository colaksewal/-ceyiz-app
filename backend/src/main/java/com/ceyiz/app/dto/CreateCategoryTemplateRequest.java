package com.ceyiz.app.dto;

// parentId: doluysa şablon o (üst) şablonun alt kategorisi olur; boşsa üst şablon.
public record CreateCategoryTemplateRequest(String name, int displayOrder, java.util.UUID parentId) {}
