package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * Arka planda çalışan bir AI isteğinin durumu. Frontend bunu birkaç saniyede bir sorar.
 * status: PENDING (sırada), RUNNING, DONE (result dolu), EMPTY (AI bir şey çıkaramadı),
 * FAILED (hata, error dolu). queuePosition sadece PENDING'de anlamlı: önündeki iş sayısı.
 */
public record AiJobResponse(
        UUID id,
        String status,
        int queuePosition,
        Object result,
        String error
) {}
