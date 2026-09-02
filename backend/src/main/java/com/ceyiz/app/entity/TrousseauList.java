package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;


@Getter
@Entity
@Table(name = "lists")
public class TrousseauList {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name="owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable= false)
    private String name;

    @Column(name = "wedding_date")
    private LocalDate weddingDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();


    protected TrousseauList() {}


    public TrousseauList(UUID ownerId, String name, LocalDate weddingDate) {
        this.ownerId = ownerId;
        this.name = name;
        this.weddingDate = weddingDate;
    }


}
