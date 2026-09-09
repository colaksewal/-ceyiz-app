package com.ceyiz.app.controller;

import com.ceyiz.app.dto.ListSuggestionRequest;
import com.ceyiz.app.dto.ListSuggestionResponse;
import com.ceyiz.app.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/list-suggestion")
    public ResponseEntity<ListSuggestionResponse> suggestList(@RequestBody ListSuggestionRequest request) {
        return aiService.suggestList(request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

}