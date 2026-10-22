package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Bir AI isteğinin kaydı (bkz. AiLogService). JSON alanları metin olarak tutulur; sadece admin
 * ekranında gösterilip başarı puanı hesaplanırken okunuyorlar.
 */
@Getter
@Entity
@Table(name = "ai_logs")
public class AiLog {

    // AiJobService'in iş kimliği; üretilmez, dışarıdan verilir.
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String kind;

    @Column(name = "input_text")
    private String inputText;

    @Column(name = "input_file_url")
    private String inputFileUrl;

    @Column(name = "input_content_type")
    private String inputContentType;

    @Column(name = "raw_response")
    private String rawResponse;

    @Column(name = "result_json")
    private String resultJson;

    @Column(nullable = false)
    private String status;

    private String error;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "used_json")
    private String usedJson;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected AiLog() {}

    public AiLog(UUID id, UUID userId, String kind, String inputText, String inputFileUrl, String inputContentType) {
        this.id = id;
        this.userId = userId;
        this.kind = kind;
        this.inputText = inputText;
        this.inputFileUrl = inputFileUrl;
        this.inputContentType = inputContentType;
        this.status = "PENDING";
    }

    public void recordRawResponse(String rawResponse) {
        this.rawResponse = rawResponse;
    }

    public void finish(String status, String resultJson, String error, long durationMs) {
        this.status = status;
        this.resultJson = resultJson;
        this.error = error;
        this.durationMs = durationMs;
    }

    public void markUsed(String usedJson) {
        this.usedJson = usedJson;
        this.usedAt = Instant.now();
    }
}
