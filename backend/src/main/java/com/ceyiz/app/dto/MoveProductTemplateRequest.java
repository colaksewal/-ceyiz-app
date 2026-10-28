package com.ceyiz.app.dto;

import java.util.UUID;

/** Ürün şablonunu aynı ailedeki (üst şablon ve alt şablonları) başka bir kategori şablonuna taşır. */
public record MoveProductTemplateRequest(UUID categoryTemplateId) {}
