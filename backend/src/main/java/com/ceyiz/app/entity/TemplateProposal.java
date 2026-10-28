package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

/**
 * Kullanıcının listesinden ürettiği şablon önerisi. content: gönderildiği andaki liste (kategoriler, alt kategoriler,
 * ürün adları) JSON olarak; admin yayınlarken düzenleyebilir.
 */
@Getter
@Entity
@Table(name = "template_proposals")
public class TemplateProposal {

    public enum Status { PENDING, PUBLISHED, REJECTED }

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(nullable = false)
    private String title;

    private String note;

    @Column(nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(name = "admin_note")
    private String adminNote;

    // DB'deki DEFAULT now() devreye girmez: Hibernate INSERT'te tüm kolonları açıkça gönderir.
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    protected TemplateProposal() {}

    public TemplateProposal(UUID submittedBy, String title, String note, String content) {
        this.submittedBy = submittedBy;
        this.title = title;
        this.note = note;
        this.content = content;
    }

    public void publish() {
        this.status = Status.PUBLISHED;
        this.reviewedAt = Instant.now();
    }

    public void reject(String adminNote) {
        this.status = Status.REJECTED;
        this.adminNote = adminNote;
        this.reviewedAt = Instant.now();
    }
}
