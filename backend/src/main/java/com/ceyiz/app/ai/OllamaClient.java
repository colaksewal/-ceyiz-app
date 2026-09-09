package com.ceyiz.app.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OllamaClient implements AiClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(120);

    private final WebClient webClient;
    private final String model;

    public OllamaClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.ai.ollama.base-url}") String baseUrl,
            @Value("${app.ai.ollama.model}") String model
    ) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.model = model;
    }

    @Override
    public Optional<String> complete(String prompt) {
        try {
            OllamaGenerateResponse response = webClient.post()
                    .uri("/api/generate")
                    .bodyValue(Map.of(
                            "model", model,
                            "prompt", prompt,
                            "stream", false,
                            "format", "json"
                    ))
                    .retrieve()
                    .bodyToMono(OllamaGenerateResponse.class)
                    .block(REQUEST_TIMEOUT);

            if (response == null || response.response() == null || response.response().isBlank()) {
                log.warn("Ollama boş yanıt döndü");
                return Optional.empty();
            }
            return Optional.of(response.response());
        } catch (Exception e) {
            log.warn("Ollama isteği başarısız oldu: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OllamaGenerateResponse(String response) {
    }

}