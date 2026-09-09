package com.ceyiz.app.entity;

import jakarta.persistence.*;
import lombok.Getter;

import java.util.UUID;

@Getter
@Entity
@Table(name = "list_shares")
public class ListShare {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShareRole role;

    protected ListShare() {}

    public ListShare(UUID listId, UUID userId, ShareRole role) {
        this.listId = listId;
        this.userId = userId;
        this.role = role;
    }

    public void changeRole(ShareRole newRole) {
        this.role = newRole;
    }

}
