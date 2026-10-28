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

    boolean existsByProductSetId(UUID productSetId);

    // [kategori id, ürün sayısı, alınan (PURCHASED) sayısı]; ürünü olmayan kategori satır dönmez.
    @Query("""
            SELECT p.categoryId, COUNT(p),
                   COALESCE(SUM(CASE WHEN p.status = :purchased THEN 1 ELSE 0 END), 0)
            FROM Product p
            WHERE p.categoryId IN :categoryIds
            GROUP BY p.categoryId
            """)
    List<Object[]> countByCategoryIds(@Param("categoryIds") Collection<UUID> categoryIds,
                                      @Param("purchased") com.ceyiz.app.entity.ProductStatus purchased);

    @Query("""
            SELECT COUNT(p) > 0 FROM Product p, Category c
            WHERE p.categoryId = c.id AND c.listId IN :listIds
            """)
    boolean existsInLists(@Param("listIds") Collection<UUID> listIds);
}
