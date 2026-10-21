package com.ceyiz.app.controller;

import com.ceyiz.app.dto.CreateSetTemplateRequest;
import com.ceyiz.app.dto.SetTemplateResponse;
import com.ceyiz.app.dto.SetTemplateSuggestionResponse;
import com.ceyiz.app.service.SetTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/set-templates")
public class SetTemplateController {

    private final SetTemplateService setTemplateService;

    @GetMapping
    public ResponseEntity<List<SetTemplateResponse>> getAllSetTemplates(Authentication authentication) {
        UUID adminId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(setTemplateService.getAllSetTemplates(adminId));
    }

    @PostMapping
    public ResponseEntity<SetTemplateResponse> createSetTemplate(
            @RequestBody CreateSetTemplateRequest request,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(setTemplateService.createSetTemplate(adminId, request));
    }

    // AI'ya ulaşılamazsa ya da yanıt anlaşılamazsa 204 döner; frontend formu elle doldurmaya devam eder.
    @PostMapping(value = "/ai-suggestion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SetTemplateSuggestionResponse> suggestFromFile(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "text", required = false) String text,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        return setTemplateService.suggest(adminId, file, text)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @DeleteMapping("/{setTemplateId}")
    public ResponseEntity<Void> deleteSetTemplate(
            @PathVariable UUID setTemplateId,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        setTemplateService.deleteSetTemplate(adminId, setTemplateId);
        return ResponseEntity.noContent().build();
    }
}
