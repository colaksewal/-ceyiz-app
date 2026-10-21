package com.ceyiz.app.controller;

import com.ceyiz.app.dto.AiJobStartedResponse;
import com.ceyiz.app.dto.CreateSetTemplateRequest;
import com.ceyiz.app.dto.SetTemplateResponse;
import com.ceyiz.app.service.SetTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/set-templates")
public class SetTemplateController {

    private final SetTemplateService setTemplateService;

    @GetMapping
    public ResponseEntity<List<SetTemplateResponse>> getAllSetTemplates(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(setTemplateService.getAllSetTemplates(userId));
    }

    @PostMapping
    public ResponseEntity<SetTemplateResponse> createSetTemplate(
            @RequestBody CreateSetTemplateRequest request,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(setTemplateService.createSetTemplate(userId, request));
    }

    // Arka planda çalışır: 202 + iş kimliği döner, sonuç GET /api/ai/jobs/{jobId} ile sorulur.
    // AI bir şey çıkaramazsa iş EMPTY biter; frontend formu elle doldurmaya devam eder.
    @PostMapping(value = "/ai-suggestion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiJobStartedResponse> suggestFromFile(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "text", required = false) String text,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        UUID jobId = setTemplateService.suggest(userId, file, text);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(new AiJobStartedResponse(jobId));
    }

    @DeleteMapping("/{setTemplateId}")
    public ResponseEntity<Void> deleteSetTemplate(
            @PathVariable UUID setTemplateId,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        setTemplateService.deleteSetTemplate(userId, setTemplateId);
        return ResponseEntity.noContent().build();
    }
}
