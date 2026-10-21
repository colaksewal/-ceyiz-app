package com.ceyiz.app.repository;

import com.ceyiz.app.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findByCategoryId(UUID categoryId);

    List<Product> findByCategoryIdIn(Collection<UUID> categoryIds);

    @Query("""
            SELECT COUNT(p) > 0 FROM Product p, Category c
            WHERE p.categoryId = c.id AND c.listId IN :listIds
            """)
    boolean existsInLists(@Param("listIds") Collection<UUID> listIds);
}
