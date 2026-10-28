package com.ceyiz.app.dto;

import java.util.UUID;

/** priceId: katalog setinin sadece bu fiyatı eklenir; boşsa setin tüm fiyatları ürüne fiyat notu olarak eklenir. */
public record AttachSetToProductRequest(UUID setTemplateId, UUID priceId) {}
