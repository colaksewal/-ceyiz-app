package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.util.UUID;

@Getter
@Entity
@Table(name = "product_templates")
public class ProductTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "category_template_id", nullable = false)
    private UUID categoryTemplateId;

    @Column(nullable = false)
    private String name;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected ProductTemplate() {}

    public ProductTemplate(UUID categoryTemplateId, String name, int displayOrder) {
        this.categoryTemplateId = categoryTemplateId;
        this.name = name;
        this.displayOrder = displayOrder;
    }
}   