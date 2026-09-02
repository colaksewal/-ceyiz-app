package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Entity
@Table(name = "product_sets")
public class ProductSet {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(nullable = false)
    private String name;

    @Column(name = "store_name")
    private String storeName;

    @Column(name = "set_price", nullable = false)
    private BigDecimal setPrice;

    protected ProductSet() {}

    public ProductSet(UUID listId, String name, String storeName, BigDecimal setPrice) {
        this.listId = listId;
        this.name = name;
        this.storeName = storeName;
        this.setPrice = setPrice;
    }
}