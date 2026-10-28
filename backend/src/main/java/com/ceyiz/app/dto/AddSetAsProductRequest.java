package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * Seti listeye tek bir ürün olarak ekler. categoryKey: ürünün gireceği kategori ("c:" mevcut, "n:" eklenirken
 * açılacak; bkz. SetPlacementPreview). productName boşsa setin adı kullanılır. priceId boşsa setin tüm fiyatları
 * ürüne fiyat notu olur.
 */
public record AddSetAsProductRequest(UUID setTemplateId, UUID priceId, String categoryKey, String productName) {}
