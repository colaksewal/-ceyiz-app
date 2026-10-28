package com.ceyiz.app.controller;

import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.dto.AiJobResponse;
import com.ceyiz.app.dto.AiJobStartedResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.ceyiz.app.service.AiJobService;
import com.ceyiz.app.service.AiLogService;
import com.ceyiz.app.service.AiSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * AI istekleri arka planda çalışır: POST hemen 202 + iş kimliği döner, sonuç
 * GET /api/ai/jobs/{jobId} ile sorulur (bkz. AiJobService).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai")
public class AiSuggestionController {

    private final AiSuggestionService aiSuggestionService;
    private final AiJobService aiJobService;
    private final AiLogService aiLogService;
    private final com.ceyiz.app.service.TemplateGroupService templateGroupService;

    @PostMapping(value = "/suggestions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiJobStartedResponse> suggest(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "categoryId", required = false) UUID categoryId,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        AiInput input = aiSuggestionService.prepare(file, text);
        // Kategorinin admin tanımlı alt kategorileri varsa öneri sadece onlara girenlerle sınırlanır.
        var groups = categoryId == null ? java.util.List.<com.ceyiz.app.service.TemplateGroupService.Group>of()
                : templateGroupService.groupsForCategory(categoryId, userId);
        UUID jobId = aiJobService.submit(userId, AiLogService.KIND_PRODUCTS, input,
                () -> aiSuggestionService.suggest(input, groups));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new AiJobStartedResponse(jobId));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<AiJobResponse> getJob(@PathVariable UUID jobId, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(aiJobService.get(userId, jobId));
    }

    // Kullanıcı AI'nın önerisini kaydedince frontend o an kaydedilen hali gönderir; admin ekranı
    // öneriyle karşılaştırıp başarı puanı hesaplar. İş bellekten silinmiş olsa da kayıt DB'de durur.
    @PostMapping("/jobs/{jobId}/outcome")
    public ResponseEntity<Void> reportOutcome(
            @PathVariable UUID jobId,
            @RequestBody JsonNode used,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        aiLogService.recordOutcome(userId, jobId, used);
        return ResponseEntity.noContent().build();
    }
}
