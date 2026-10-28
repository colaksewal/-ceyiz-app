package com.ceyiz.app.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** categories: gönderildiği andaki liste; productCount tüm kategorilerdeki ürün sayısı. */
public record TemplateProposalResponse(
        UUID id,
        String title,
        String note,
        String status,
        String adminNote,
        String submittedByName,
        Instant createdAt,
        Instant reviewedAt,
        int productCount,
        List<ProposalCategory> categories
) {}
