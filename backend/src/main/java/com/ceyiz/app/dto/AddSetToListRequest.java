package com.ceyiz.app.dto;

import java.util.List;
import java.util.UUID;

/**
 * priceId: katalog setinin hangi fiyatı listeye yazılacak; boşsa toplamı en düşük fiyat seçilir.
 * placements: parçaların hedef kategorisi (bkz. SetPlacementPreview); verilmeyen parça önerilen hedefe gider.
 */
public record AddSetToListRequest(UUID setTemplateId, UUID priceId, List<Placement> placements) {

    public record Placement(UUID setTemplateItemId, String destinationKey) {}
}
