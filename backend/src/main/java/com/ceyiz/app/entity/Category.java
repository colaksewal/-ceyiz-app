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

    // Alt kategorilerde üst kategorinin kimliği; üst kategoride null. Sadece tek seviye var.
    @Column(name = "parent_id")
    private UUID parentId;

    @Column(nullable = false)
    private String name;

    protected Category() {}

    public Category(UUID listId, String name){
        this(listId, null, name);
    }

    public Category(UUID listId, UUID parentId, String name){
        this.listId = listId;
        this.parentId = parentId;
        this.name = name;
    }

    public void rename(String name){
        this.name = name;
    }



}
