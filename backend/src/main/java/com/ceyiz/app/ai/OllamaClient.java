package com.ceyiz.app.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class OllamaClient implements AiClient {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(180);

    private final WebClient webClient;
    private final String model;
    private final String keepAlive;

    public OllamaClient(
            WebClient.Builder webClientBuilder,
            @Value("${app.ai.ollama.base-url}") String baseUrl,
            @Value("${app.ai.ollama.model}") String model,
            @Value("${app.ai.ollama.keep-alive}") String keepAlive
    ) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.model = model;
        this.keepAlive = keepAlive;
    }

    @Override
    public Optional<String> complete(String prompt) {
        return generate(prompt, null);
    }

    @Override
    public Optional<String> completeWithImage(String prompt, String base64Image) {
        return generate(prompt, base64Image);
    }

    private Optional<String> generate(String prompt, String base64Image) {
        try {
            Map<String, Object> body = new HashMap<>(Map.of(
                    "model", model,
                    "prompt", prompt,
                    "stream", false,
                    "format", "json",
                    "keep_alive", keepAlive
            ));
            if (base64Image != null) {
                body.put("images", List.of(base64Image));
            }

            OllamaGenerateResponse response = webClient.post()
                    .uri("/api/generate")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(OllamaGenerateResponse.class)
                    .block(REQUEST_TIMEOUT);

            if (response == null || response.response() == null || response.response().isBlank()) {
                log.warn("Ollama boş yanıt döndü");
                return Optional.empty();
            }
            logTimings(response, base64Image != null);
            return Optional.of(response.response());
        } catch (Exception e) {
            log.warn("Ollama isteği başarısız oldu: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // Sürenin nereye gittiğini ayırır: model yükleme (cold start), prompt+görselin okunması,
    // cevabın üretilmesi. Yavaşlığı hangi adımın yarattığı bu satırdan okunur.
    private void logTimings(OllamaGenerateResponse r, boolean withImage) {
        log.info("Ollama yanıtı {} sn (model={}, görsel={}): yükleme {} sn, girdi {} token / {} sn, çıktı {} token / {} sn",
                seconds(r.totalDuration()), model, withImage,
                seconds(r.loadDuration()),
                r.promptEvalCount(), seconds(r.promptEvalDuration()),
                r.evalCount(), seconds(r.evalDuration()));
    }

    private static String seconds(Long nanos) {
        return nanos == null ? "?" : String.format("%.1f", nanos / 1_000_000_000.0);
    }

    // Süreler Ollama'dan nanosaniye olarak gelir.
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OllamaGenerateResponse(
            String response,
            @JsonProperty("total_duration") Long totalDuration,
            @JsonProperty("load_duration") Long loadDuration,
            @JsonProperty("prompt_eval_count") Integer promptEvalCount,
            @JsonProperty("prompt_eval_duration") Long promptEvalDuration,
            @JsonProperty("eval_count") Integer evalCount,
            @JsonProperty("eval_duration") Long evalDuration
    ) {
    }

}
