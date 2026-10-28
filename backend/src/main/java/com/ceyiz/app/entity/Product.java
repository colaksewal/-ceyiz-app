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

    // Ürün sayfası linki (opsiyonel).
    private String url;

    // Ürün bir setten ("Cam Bardak Seti") açıldıysa o liste seti; parçaları ürünün altında listelenir.
    @Column(name = "product_set_id")
    private UUID productSetId;

    protected Product(){}

    public Product(UUID categoryId, String name){

        this.categoryId = categoryId;
        this.name = name;
        this.status = ProductStatus.PLANNED;

    }

    public void linkToSet(UUID productSetId){
        this.productSetId = productSetId;
    }

    public void changeUrl(String url){
        this.url = url;
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
