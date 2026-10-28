package com.ceyiz.app.dto;

import java.util.UUID;

/** priceId: katalog setinin hangi fiyatı listeye yazılacak; boşsa toplamı en düşük fiyat seçilir. */
public record AddSetToListRequest(UUID setTemplateId, UUID priceId) {}
