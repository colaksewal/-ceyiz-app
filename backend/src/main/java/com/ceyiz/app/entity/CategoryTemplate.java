package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.util.UUID;

@Getter
@Entity
@Table(name = "category_templates")
public class CategoryTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    // Alt kategori şablonunda üst şablonun kimliği; üst şablonda null (tek seviye).
    @Column(name = "parent_id")
    private UUID parentId;

    protected CategoryTemplate() {}

    public CategoryTemplate(String name, int displayOrder) {
        this(name, displayOrder, null);
    }

    public CategoryTemplate(String name, int displayOrder, UUID parentId) {
        this.name = name;
        this.displayOrder = displayOrder;
        this.parentId = parentId;
    }
}