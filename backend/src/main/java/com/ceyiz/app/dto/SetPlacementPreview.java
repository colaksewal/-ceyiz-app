package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * Katalog seti listeye eklenmeden önceki önizleme: her parça ve önerilen hedefi (suggestedKey), ayrıca
 * hedefi kademeli seçtirmek için listedeki kategoriler ve ürünler. Hedef anahtarı ("c:&lt;kategori id&gt;" mevcut
 * kategoride yeni ürün, "n:&lt;üst&gt;|&lt;ad&gt;" eklenirken açılacak kategoride yeni ürün, "p:&lt;ürün id&gt;" mevcut
 * ürüne ekle, "skip" listeye ekleme) olduğu gibi AddSetToListRequest.placements içinde geri gönderilir.
 */
public record SetPlacementPreview(List<Item> items, List<Category> categories, List<Product> products) {

    public record Item(UUID id, String itemName, int quantity, String suggestedKey) {}

    /** parentKey: alt kategoride üst kategorinin anahtarı, üst kategoride null. isNew: eklenirken açılacak. */
    public record Category(String key, String name, String parentKey, boolean isNew) {}

    /** key "p:&lt;id&gt;"; categoryKey ürünün bulunduğu kategorinin anahtarı. */
    public record Product(String key, String name, String categoryKey) {}
}
