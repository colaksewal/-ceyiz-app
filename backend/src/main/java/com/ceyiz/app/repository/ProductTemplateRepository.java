package com.ceyiz.app.repository;

import com.ceyiz.app.entity.ProductTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductTemplateRepository extends JpaRepository<ProductTemplate, UUID> {

    List<ProductTemplate> findByCategoryTemplateIdOrderByDisplayOrder(UUID categoryTemplateId);

    List<ProductTemplate> findAllByOrderByDisplayOrder();
}