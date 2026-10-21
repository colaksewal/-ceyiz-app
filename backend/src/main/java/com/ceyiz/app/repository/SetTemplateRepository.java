package com.ceyiz.app.repository;

import com.ceyiz.app.entity.SetTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SetTemplateRepository extends JpaRepository<SetTemplate, UUID> {

    List<SetTemplate> findAllByOrderByDisplayOrder();
}
