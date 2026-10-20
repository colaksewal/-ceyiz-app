package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ProductStatus;

// İki alan da opsiyonel: sadece gönderilen (null olmayan) alan güncellenir.
public record UpdateProductRequest(String name, ProductStatus status) { }
