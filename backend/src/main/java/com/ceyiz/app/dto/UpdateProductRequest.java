package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ProductStatus;

import java.util.UUID;

// Alanların hepsi opsiyonel: sadece gönderilen (null olmayan) alan güncellenir.
// url: ürün sayfası linki; boş string linki kaldırır.
// categoryId: ürünü aynı kategorinin altındaki başka bir (alt) kategoriye taşır.
public record UpdateProductRequest(String name, ProductStatus status, UUID categoryId, String url) { }
