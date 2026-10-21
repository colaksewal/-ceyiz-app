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

    // Birim fiyat (tek alınırsa); toplam = quantity × bu değer, ayrıca saklanmıyor.
    @Column(name = "estimated_individual_price")
    private BigDecimal estimatedIndividualPrice;

    private String note;

    protected SetTemplateItem() {}

    public SetTemplateItem(UUID setTemplateId, String itemName, int quantity, int displayOrder,
                           BigDecimal estimatedIndividualPrice, String note) {
        this.setTemplateId = setTemplateId;
        this.itemName = itemName;
        this.quantity = quantity;
        this.displayOrder = displayOrder;
        this.estimatedIndividualPrice = estimatedIndividualPrice;
        this.note = note;
    }
}
