package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * Kullanıcı listesinden SEÇTİĞİ kategorileri şablon olarak önerir: başlık, admine not ve seçilen kategoriler.
 * Her seçimde includeProducts kapalıysa sadece kategorinin adı gider, içindeki ürün adları paylaşılmaz.
 * Alt kategori, ancak üst kategorisi de seçiliyse öneriye girer.
 */
public record ProposeTemplateRequest(UUID listId, String title, String note, List<CategorySelection> categories) {

    public record CategorySelection(UUID categoryId, boolean includeProducts) {}
}
