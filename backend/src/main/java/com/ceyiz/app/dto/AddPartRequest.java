package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * Setin TEK bir kalemini listeye ekler. destinationKey: "c:"/"n:" kategoride yeni ürün olarak ekle,
 * "p:&lt;ürün id&gt;" listedeki mevcut ürüne ekle (bkz. SetPlacementPreview). newProductName: yeni üründe kullanılacak
 * ad; boşsa kalemin adı.
 */
public record AddPartRequest(UUID setTemplateItemId, String destinationKey, String newProductName) {}
