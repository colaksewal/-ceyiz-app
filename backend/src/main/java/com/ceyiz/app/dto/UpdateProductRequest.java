package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ProductStatus;

// Alanların hepsi opsiyonel: sadece gönderilen (null olmayan) alan güncellenir.
// group: boş string ("") grubu kaldırır (gruplanmamış yapar).
public record UpdateProductRequest(String name, ProductStatus status, String group) { }
