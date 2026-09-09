package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiClient;
import com.ceyiz.app.dto.ListSuggestionRequest;
import com.ceyiz.app.dto.ListSuggestionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    public Optional<ListSuggestionResponse> suggestList(ListSuggestionRequest request) {
        Optional<String> prompt = buildListSuggestionPrompt(request);
        if (prompt.isEmpty()) {
            return Optional.empty();
        }

        return aiClient.complete(prompt.get())
                .flatMap(this::parseListSuggestionResponse);
    }

    private Optional<String> buildListSuggestionPrompt(ListSuggestionRequest request) {
        try {
            String template = new String(
                    new ClassPathResource("prompts/list-suggestion.txt").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8
            );
            String priorities = String.join(", ", request.priorities());
            String prompt = template
                    .replace("{{homeType}}", request.homeType())
                    .replace("{{budget}}", request.budget().toPlainString())
                    .replace("{{priorities}}", priorities);
            return Optional.of(prompt);
        } catch (IOException e) {
            log.error("list-suggestion prompt şablonu okunamadı", e);
            return Optional.empty();
        }
    }

    private Optional<ListSuggestionResponse> parseListSuggestionResponse(String json) {
        try {
            return Optional.of(objectMapper.readValue(json, ListSuggestionResponse.class));
        } catch (IOException e) {
            log.warn("AI yanıtı beklenen JSON formatında değil: {}", e.getMessage());
            return Optional.empty();
        }
    }

}