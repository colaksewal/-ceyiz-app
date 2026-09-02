package com.ceyiz.app.entity;


import jakarta.persistence.*;
import lombok.Getter;

import java.util.*;

@Getter
@Entity
@Table(name="products")
public class Product {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status;

    protected Product(){}

    public Product(UUID categoryId, String name){

        this.categoryId = categoryId;
        this.name = name;
        this.status = ProductStatus.PLANNED;

    }

}
