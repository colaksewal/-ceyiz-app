package com.ceyiz.app.controller;

import com.ceyiz.app.dto.AiLogResponse;
import com.ceyiz.app.dto.AiLogStatsResponse;
import com.ceyiz.app.service.AiLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/ai-logs")
public class AiLogController {

    private final AiLogService aiLogService;

    // En yeni 200 kayıt; kind verilirse sadece o tür.
    @GetMapping
    public ResponseEntity<List<AiLogResponse>> getLogs(
            @RequestParam(value = "kind", required = false) String kind,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(aiLogService.getLogs(userId, kind));
    }

    @GetMapping("/stats")
    public ResponseEntity<List<AiLogStatsResponse>> getStats(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(aiLogService.getStats(userId));
    }
}
