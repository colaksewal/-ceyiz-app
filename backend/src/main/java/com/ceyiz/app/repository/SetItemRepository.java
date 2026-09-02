package com.ceyiz.app.repository;

import com.ceyiz.app.entity.SetItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SetItemRepository extends JpaRepository<SetItem, UUID> {

    List<SetItem> findBySetId(UUID setId);
}