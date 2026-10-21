package com.ceyiz.app.repository;

import com.ceyiz.app.entity.SetTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SetTemplateItemRepository extends JpaRepository<SetTemplateItem, UUID> {

    List<SetTemplateItem> findBySetTemplateIdOrderByDisplayOrder(UUID setTemplateId);
}
