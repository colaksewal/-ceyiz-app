package com.ceyiz.app.repository;

import com.ceyiz.app.entity.PriceEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceEntryRepository extends JpaRepository<PriceEntry, UUID> {

    List<PriceEntry> findByProductId(UUID productId);

    Optional<PriceEntry> findByProductIdAndIsPreferredTrue(UUID productId);



}
