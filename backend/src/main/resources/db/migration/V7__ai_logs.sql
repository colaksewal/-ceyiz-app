-- Her AI isteğinin kaydı: kullanıcının verdiği girdi, AI'nın ham cevabı ve kullanıcının sonunda
-- kaydettiği hali. Admin, AI önerisinin ne kadarının değiştirilmeden kullanıldığına buradan bakar.
-- id, AiJobService'teki iş kimliğiyle aynı; frontend sonucu kaydedince bu kimlikle bildirir.
CREATE TABLE ai_logs (
    id                 UUID PRIMARY KEY,
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind               VARCHAR(50) NOT NULL,
    input_text         TEXT,
    input_file_url     TEXT,
    input_content_type VARCHAR(100),
    raw_response       TEXT,
    result_json        TEXT,
    status             VARCHAR(20) NOT NULL,
    error              TEXT,
    duration_ms        BIGINT,
    used_json          TEXT,
    used_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_logs_created_at ON ai_logs(created_at DESC);
CREATE INDEX idx_ai_logs_kind ON ai_logs(kind);
