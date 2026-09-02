package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.util.UUID;

@Getter
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name= "list_id", nullable = false)
    private UUID listId;

    @Column(nullable = false)
    private String name;

    protected Category() {}

    public Category(UUID listId, String name){
        this.listId = listId;
        this.name = name;
    }



}
