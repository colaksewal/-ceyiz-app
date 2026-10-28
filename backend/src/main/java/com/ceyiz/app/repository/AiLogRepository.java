package com.ceyiz.app.repository;

import com.ceyiz.app.entity.AiLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiLogRepository extends JpaRepository<AiLog, UUID> {

    List<AiLog> findTop200ByOrderByCreatedAtDesc();

    List<AiLog> findTop200ByKindOrderByCreatedAtDesc(String kind);
}
