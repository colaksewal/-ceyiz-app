package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Entity
@Table(name="users")
public class User {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable= false, unique = true)
    private String email;

    @Column(name="password_hash",nullable = false)
    private String passwordHash;

    @Column(nullable= false )
    private String name;

    @Column(name = "created_at", nullable= false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name="is_admin", nullable = false)
    private boolean isAdmin = false;

    protected User(){}

    public User(String email, String passwordHash, String name){
        this.email= email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.isAdmin = false;
    }


}
