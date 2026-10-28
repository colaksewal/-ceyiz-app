package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * productCount / purchasedCount: kategorinin DOĞRUDAN ürünleri (alt kategorilerinki dahil değil). Sadece
 * liste endpoint'inde dolar; başlıkta ürün sayısı kategori açılmadan görünsün diye.
 * groupNames: üst kategoride admin'in tanımladığı alt kategori adları (boşsa AI ile alt kategorilere ayırma yok).
 */
public record CategoryResponse(UUID id, String name, UUID parentId, int productCount, int purchasedCount,
                               java.util.List<String> groupNames) {

    public static CategoryResponse from(com.ceyiz.app.entity.Category category) {
        return from(category, 0, 0, java.util.List.of());
    }

    public static CategoryResponse from(com.ceyiz.app.entity.Category category, int productCount, int purchasedCount,
                                        java.util.List<String> groupNames) {
        return new CategoryResponse(category.getId(), category.getName(), category.getParentId(),
                productCount, purchasedCount, groupNames);
    }
}
