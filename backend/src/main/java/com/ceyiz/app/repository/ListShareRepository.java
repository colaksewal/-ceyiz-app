package com.ceyiz.app.repository;

import com.ceyiz.app.entity.ListShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListShareRepository extends JpaRepository<ListShare, UUID> {

    List<ListShare> findByListId(UUID listId);

    List<ListShare> findByUserId(UUID userId);

    Optional<ListShare> findByListIdAndUserId(UUID listId, UUID userId);

}
