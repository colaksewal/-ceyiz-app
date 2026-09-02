package com.ceyiz.app.repository;

import com.ceyiz.app.entity.TrousseauList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ListRepository extends JpaRepository<TrousseauList, UUID> {

    List<TrousseauList> findByOwnerId(UUID ownerId);
}
