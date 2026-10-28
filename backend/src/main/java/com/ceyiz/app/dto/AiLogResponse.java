package com.ceyiz.app.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Admin ekranındaki bir AI kaydı. score: AI önerisinin kullanıcının kaydettiği hale ne kadar
 * benzediği (0-100); kullanıcı sonucu kaydetmediyse ya da tür için ölçü yoksa null.
 */
public record AiLogResponse(
        UUID id,
        String userEmail,
        String kind,
        String inputText,
        String inputFileUrl,
        String inputContentType,
        String rawResponse,
        String resultJson,
        String status,
        String error,
        Long durationMs,
        String usedJson,
        Instant usedAt,
        Instant createdAt,
        Integer score
) {}
