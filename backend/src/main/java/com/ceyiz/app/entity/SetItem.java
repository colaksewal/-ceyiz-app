package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Entity
@Table(name = "set_items")
public class SetItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "set_id", nullable = false)
    private UUID setId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "estimated_individual_price")
    private BigDecimal estimatedIndividualPrice;

    protected SetItem() {}

    public SetItem(UUID setId, UUID productId, String itemName, int quantity, BigDecimal estimatedIndividualPrice) {
        this.setId = setId;
        this.productId = productId;
        this.itemName = itemName;
        this.quantity = quantity;
        this.estimatedIndividualPrice = estimatedIndividualPrice;
    }
}