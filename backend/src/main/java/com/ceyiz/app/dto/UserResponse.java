package com.ceyiz.app.dto;

import com.ceyiz.app.entity.User;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String email, String name, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getCreatedAt());
    }

}
