package com.ceyiz.app.dto;

import java.util.UUID;

/** partCount: setin parça adetleri toplamı; priceNoteCount: ürüne eklenen fiyat notu sayısı. */
public record AddSetAsProductResponse(UUID productId, String productName, int partCount, int priceNoteCount) {}
