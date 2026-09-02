package com.ceyiz.app.repository;

import com.ceyiz.app.entity.ProductSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductSetRepository extends JpaRepository<ProductSet, UUID> {

    List<ProductSet> findByListId(UUID listId);
}