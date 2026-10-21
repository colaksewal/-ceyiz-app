package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name = "set_templates")
public class SetTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String brand;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    // DB'deki DEFAULT now() devreye girmez: Hibernate INSERT'te tüm kolonları açıkça gönderir.
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SetTemplate() {}

    public SetTemplate(String name, String brand, int displayOrder) {
        this.name = name;
        this.brand = brand;
        this.displayOrder = displayOrder;
    }
}
