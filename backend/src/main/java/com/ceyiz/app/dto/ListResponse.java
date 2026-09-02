package com.ceyiz.app.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ListResponse(UUID id, String name, LocalDate weddingDate, Instant createdAt) {

    public static ListResponse from(com.ceyiz.app.entity.TrousseauList list) {
        return new ListResponse(
                list.getId(),
                list.getName(),
                list.getWeddingDate(),
                list.getCreatedAt()
        );
    }

}
