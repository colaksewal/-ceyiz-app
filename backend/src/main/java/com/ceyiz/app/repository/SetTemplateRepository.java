package com.ceyiz.app.repository;

import com.ceyiz.app.entity.SetTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SetTemplateRepository extends JpaRepository<SetTemplate, UUID> {

    // Önce adminin setleri (kendi sıralarıyla), ardından kullanıcının kendi setleri.
    @Query("""
            SELECT s FROM SetTemplate s
            WHERE s.createdByAdmin = true OR s.createdBy = :userId
            ORDER BY s.createdByAdmin DESC, s.displayOrder, s.createdAt
            """)
    List<SetTemplate> findVisibleTo(@Param("userId") UUID userId);
}
