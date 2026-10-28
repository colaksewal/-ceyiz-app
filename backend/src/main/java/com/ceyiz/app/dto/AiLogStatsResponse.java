package com.ceyiz.app.dto;

/**
 * Bir AI türünün özeti. used: sonucu kaydedilen istek sayısı; averageScore sadece onların
 * ortalaması (0-100), hiç yoksa null. averageDurationMs biten isteklerin ortalama süresi.
 */
public record AiLogStatsResponse(
        String kind,
        int total,
        int done,
        int empty,
        int failed,
        int used,
        Integer averageScore,
        Long averageDurationMs
) {}
