package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Entity
@Table(name = "set_template_items")
public class SetTemplateItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "set_template_id", nullable = false)
    private UUID setTemplateId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    // O ürünün setten ayrı alınırsa TAMAMININ fiyatı (ör. 12 düz tabak birlikte) — adetle çarpılmaz.
    @Column(name = "estimated_separate_price")
    private BigDecimal estimatedSeparatePrice;

    private String note;

    protected SetTemplateItem() {}

    public SetTemplateItem(UUID setTemplateId, String itemName, int quantity, int displayOrder,
                           BigDecimal estimatedSeparatePrice, String note) {
        this.setTemplateId = setTemplateId;
        this.itemName = itemName;
        this.quantity = quantity;
        this.displayOrder = displayOrder;
        this.estimatedSeparatePrice = estimatedSeparatePrice;
        this.note = note;
    }
}
