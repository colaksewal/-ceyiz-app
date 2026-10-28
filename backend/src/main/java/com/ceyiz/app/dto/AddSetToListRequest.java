package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * priceId: katalog setinin hangi fiyatı listeye yazılacak; boşsa toplamı en düşük fiyat seçilir.
 * placements: parçaların hedefi (bkz. SetPlacementPreview); verilmeyen parça önerilen hedefe gider.
 * newProductName: hedef bir kategoriyse ("c:"/"n:") açılacak yeni ürünün adı; boşsa parçanın adı kullanılır.
 */
public record AddSetToListRequest(UUID setTemplateId, UUID priceId, List<Placement> placements) {

    public record Placement(UUID setTemplateItemId, String destinationKey, String newProductName) {}
}
