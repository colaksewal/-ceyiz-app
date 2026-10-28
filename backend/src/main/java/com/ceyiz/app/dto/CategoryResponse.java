package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * productCount / purchasedCount: kategorinin DOĞRUDAN ürünleri (alt kategorilerinki dahil değil). Sadece
 * liste endpoint'inde dolar; başlıkta ürün sayısı kategori açılmadan görünsün diye.
 */
public record CategoryResponse(UUID id, String name, UUID parentId, int productCount, int purchasedCount) {

    public static CategoryResponse from(com.ceyiz.app.entity.Category category) {
        return from(category, 0, 0);
    }

    public static CategoryResponse from(com.ceyiz.app.entity.Category category, int productCount, int purchasedCount) {
        return new CategoryResponse(category.getId(), category.getName(), category.getParentId(),
                productCount, purchasedCount);
    }
}
