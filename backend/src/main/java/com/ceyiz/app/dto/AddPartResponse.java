package com.ceyiz.app.dto;

import java.util.UUID;

/** created: kalem için yeni ürün açıldı (false: mevcut bir ürüne eklendi/bağlandı). */
public record AddPartResponse(UUID productId, String productName, boolean created) {}
