package com.ceyiz.app.repository;

import com.ceyiz.app.entity.TemplateProposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TemplateProposalRepository extends JpaRepository<TemplateProposal, UUID> {

    List<TemplateProposal> findBySubmittedByOrderByCreatedAtDesc(UUID submittedBy);

    List<TemplateProposal> findByStatusOrderByCreatedAtAsc(TemplateProposal.Status status);

    List<TemplateProposal> findAllByOrderByCreatedAtDesc();

    long countByStatus(TemplateProposal.Status status);

    long countBySubmittedByAndStatus(UUID submittedBy, TemplateProposal.Status status);
}
