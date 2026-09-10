package com.ceyiz.app.controller;

import com.ceyiz.app.dto.ProductSuggestionResponse;
import com.ceyiz.app.service.AiSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/ai-suggestions")
public class AiSuggestionController {

    private final AiSuggestionService aiSuggestionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductSuggestionResponse> suggest(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        UUID adminId = UUID.fromString(authentication.getName());
        return aiSuggestionService.suggestFromFile(adminId, file)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
