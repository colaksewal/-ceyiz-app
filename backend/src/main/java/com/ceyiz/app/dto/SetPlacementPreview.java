package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * Katalog seti listeye eklenmeden önceki önizleme: her parça ve önerilen hedefi (suggestedKey), ayrıca
 * seçilebilecek tüm hedefler. Hedef anahtarı ("c:&lt;kategori id&gt;" mevcut kategori, "n:&lt;üst&gt;|&lt;ad&gt;" eklenirken
 * açılacak kategori, "skip" listeye ekleme) olduğu gibi AddSetToListRequest.placements içinde geri gönderilir.
 */
public record SetPlacementPreview(List<Item> items, List<Destination> destinations) {

    public record Item(UUID id, String itemName, int quantity, String suggestedKey) {}

    public record Destination(String key, String label) {}
}
