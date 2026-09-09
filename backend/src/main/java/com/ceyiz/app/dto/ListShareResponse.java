package com.ceyiz.app.dto;

import com.ceyiz.app.entity.ShareRole;

import java.util.UUID;

/**
 * shareId, owner için null olur — owner gerçek bir list_shares satırına karşılık gelmez,
 * bu yüzden frontend'de owner satırında rol değiştirme/çıkarma butonları gösterilmemeli.
 */
public record ListShareResponse(UUID shareId, UUID userId, String email, String name, ShareRole role) {
}
