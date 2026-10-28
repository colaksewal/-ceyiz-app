package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * AI'nın bir kategori için önerdiği düzen: alt kategoriler ve birleştirilebilecek ürünler.
 * Hiçbir şey yazılmadı; kullanıcı onaylayınca ApplyCategoryOrganizeRequest ile uygulanır.
 * ungrouped: hiçbir gruba yerleşmeyen ürünler; kullanıcı önizlemede elle bir gruba atar.
 */
public record CategoryOrganizeResponse(List<Group> groups, List<List<Product>> duplicates, List<Product> ungrouped) {

    public record Group(String name, List<Product> products) {}

    public record Product(UUID id, String name) {}
}
