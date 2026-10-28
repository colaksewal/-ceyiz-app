package com.ceyiz.app.dto;

import java.util.List;

/** categories: admin'in incelemede düzenlediği (kategori/ürün çıkarıp yeniden adlandırdığı) son hal; boşsa önerinin kendisi yayınlanır. */
public record PublishProposalRequest(List<ProposalCategory> categories) {}
