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

    // Mutfak için standart alt grup (bkz. KitchenGroups); null = gruplanmamış.
    @Column(name = "product_group")
    private String group;

    protected Product(){}

    public Product(UUID categoryId, String name){

        this.categoryId = categoryId;
        this.name = name;
        this.status = ProductStatus.PLANNED;

    }

    public Product(UUID categoryId, String name, String group){
        this(categoryId, name);
        this.group = group;
    }

    public void changeGroup(String group){
        this.group = group;
    }

    public void rename(String name){
        this.name = name;
    }

    public void moveTo(UUID categoryId){
        this.categoryId = categoryId;
    }

    public void changeStatus(ProductStatus status){
        this.status = status;
    }

}
