package com.ceyiz.app.controller;

import com.ceyiz.app.dto.ProposeTemplateRequest;
import com.ceyiz.app.dto.PublishProposalRequest;
import com.ceyiz.app.dto.PublishProposalResponse;
import com.ceyiz.app.dto.RejectProposalRequest;
import com.ceyiz.app.dto.TemplateProposalResponse;
import com.ceyiz.app.service.TemplateProposalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Kullanıcı: listesini şablon olarak önerir. Admin: önerileri inceler, yayınlar ya da reddeder. */
@RestController
@RequiredArgsConstructor
public class TemplateProposalController {

    private final TemplateProposalService proposalService;

    @PostMapping("/api/template-proposals")
    public ResponseEntity<TemplateProposalResponse> propose(
            @RequestBody ProposeTemplateRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(proposalService.propose(userId(authentication), request));
    }

    @GetMapping("/api/template-proposals/mine")
    public ResponseEntity<List<TemplateProposalResponse>> mine(Authentication authentication) {
        return ResponseEntity.ok(proposalService.myProposals(userId(authentication)));
    }

    @GetMapping("/api/admin/template-proposals")
    public ResponseEntity<List<TemplateProposalResponse>> adminList(
            @RequestParam(value = "status", defaultValue = "PENDING") String status,
            Authentication authentication
    ) {
        return ResponseEntity.ok(proposalService.adminList(userId(authentication), status));
    }

    @GetMapping("/api/admin/template-proposals/pending-count")
    public ResponseEntity<Map<String, Long>> pendingCount(Authentication authentication) {
        return ResponseEntity.ok(Map.of("count", proposalService.pendingCount(userId(authentication))));
    }

    @PostMapping("/api/admin/template-proposals/{proposalId}/publish")
    public ResponseEntity<PublishProposalResponse> publish(
            @PathVariable UUID proposalId,
            @RequestBody(required = false) PublishProposalRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(proposalService.publish(userId(authentication), proposalId, request));
    }

    @PostMapping("/api/admin/template-proposals/{proposalId}/reject")
    public ResponseEntity<Void> reject(
            @PathVariable UUID proposalId,
            @RequestBody(required = false) RejectProposalRequest request,
            Authentication authentication
    ) {
        proposalService.reject(userId(authentication), proposalId, request == null ? null : request.adminNote());
        return ResponseEntity.noContent().build();
    }

    private static UUID userId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
