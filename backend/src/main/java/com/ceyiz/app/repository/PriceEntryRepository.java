package com.ceyiz.app.repository;

import com.ceyiz.app.entity.PriceEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceEntryRepository extends JpaRepository<PriceEntry, UUID> {

    List<PriceEntry> findByProductId(UUID productId);

    Optional<PriceEntry> findByProductIdAndIsPreferredTrue(UUID productId);

    List<PriceEntry> findByProductIdIn(Collection<UUID> productIds);

    @Query("""
            SELECT COUNT(pe) > 0 FROM PriceEntry pe, Product p, Category c
            WHERE pe.productId = p.id AND p.categoryId = c.id AND c.listId IN :listIds
            """)
    boolean existsInLists(@Param("listIds") Collection<UUID> listIds);
}
