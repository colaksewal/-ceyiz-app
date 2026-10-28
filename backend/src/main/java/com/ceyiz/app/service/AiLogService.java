package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.dto.AiLogResponse;
import com.ceyiz.app.dto.AiLogStatsResponse;
import com.ceyiz.app.entity.AiLog;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.AiLogRepository;
import com.ceyiz.app.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * AI isteklerini kaydeder ki admin, prompt'ların ne kadar işe yaradığını ölçebilsin: kullanıcının
 * girdisi (dosyası diske kaydedilir), AI'nın ham cevabı, işlenmiş sonuç ve kullanıcının sonunda
 * kaydettiği hal. Kayıt yazılamazsa AI isteği yine çalışır; sadece loga uyarı düşer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiLogService {

    public static final String KIND_SET = "set-suggestion";
    public static final String KIND_PRODUCTS = "product-suggestion";
    public static final String KIND_PLAN_ADVICE = "payment-plan-advice";
    public static final String KIND_ORGANIZE = "category-organize";

    private static final Locale TR = Locale.forLanguageTag("tr");

    // AI işi çalışırken hangi kayda ait olduğu; ham cevap AiSuggestionService'in içinden yazılır.
    private static final ThreadLocal<UUID> CURRENT_JOB = new ThreadLocal<>();

    private final AiLogRepository aiLogRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final AdminAccessService adminAccessService;
    private final ObjectMapper objectMapper;

    /** İş kuyruğa girmeden çağrılır; böylece iş ne kadar hızlı biterse bitsin kayıt hazırdır. */
    public void start(UUID jobId, UUID userId, String kind, AiInput input) {
        try {
            String fileUrl = input.hasFile() ? fileStorageService.storeBytes(input.fileBytes(), input.contentType()) : null;
            aiLogRepository.save(new AiLog(jobId, userId, kind,
                    input.text().isEmpty() ? null : input.text(), fileUrl, input.contentType()));
        } catch (Exception e) {
            log.warn("AI kaydı oluşturulamadı: job={}", jobId, e);
        }
    }

    public <T> T runFor(UUID jobId, Supplier<T> work) {
        CURRENT_JOB.set(jobId);
        try {
            return work.get();
        } finally {
            CURRENT_JOB.remove();
        }
    }

    public void recordRawResponse(String rawResponse) {
        UUID jobId = CURRENT_JOB.get();
        if (jobId == null) return;
        update(jobId, entry -> entry.recordRawResponse(rawResponse));
    }

    public void finish(UUID jobId, String status, Object result, String error, long durationMs) {
        String resultJson = null;
        try {
            resultJson = result == null ? null : objectMapper.writeValueAsString(result);
        } catch (IOException e) {
            log.warn("AI sonucu kayda yazılamadı: job={}", jobId, e);
        }
        String json = resultJson;
        update(jobId, entry -> entry.finish(status, json, error, durationMs));
    }

    /** Kullanıcı AI'nın doldurduğunu (düzeltip ya da olduğu gibi) kaydedince frontend bildirir. */
    public void recordOutcome(UUID userId, UUID jobId, JsonNode used) {
        AiLog entry = aiLogRepository.findById(jobId)
                .filter(found -> found.getUserId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("AI kaydı bulunamadı"));
        try {
            entry.markUsed(objectMapper.writeValueAsString(used));
        } catch (IOException e) {
            throw new IllegalArgumentException("Geçersiz sonuç");
        }
        aiLogRepository.save(entry);
    }

    public List<AiLogResponse> getLogs(UUID adminId, String kind) {
        adminAccessService.requireAdmin(adminId);
        List<AiLog> logs = kind == null || kind.isBlank()
                ? aiLogRepository.findTop200ByOrderByCreatedAtDesc()
                : aiLogRepository.findTop200ByKindOrderByCreatedAtDesc(kind);
        Map<UUID, String> emails = userRepository.findAllById(logs.stream().map(AiLog::getUserId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));
        return logs.stream()
                .map(entry -> new AiLogResponse(
                        entry.getId(), emails.get(entry.getUserId()), entry.getKind(),
                        entry.getInputText(), entry.getInputFileUrl(), entry.getInputContentType(),
                        entry.getRawResponse(), entry.getResultJson(), entry.getStatus(), entry.getError(),
                        entry.getDurationMs(), entry.getUsedJson(), entry.getUsedAt(), entry.getCreatedAt(),
                        score(entry)))
                .toList();
    }

    public List<AiLogStatsResponse> getStats(UUID adminId) {
        adminAccessService.requireAdmin(adminId);
        Map<String, List<AiLog>> byKind = aiLogRepository.findAll().stream()
                .collect(Collectors.groupingBy(AiLog::getKind));
        return List.of(KIND_SET, KIND_PRODUCTS, KIND_PLAN_ADVICE, KIND_ORGANIZE).stream()
                .map(kind -> stats(kind, byKind.getOrDefault(kind, List.of())))
                .toList();
    }

    private AiLogStatsResponse stats(String kind, List<AiLog> logs) {
        List<Integer> scores = logs.stream().map(this::score).filter(Objects::nonNull).toList();
        List<Long> durations = logs.stream().map(AiLog::getDurationMs).filter(Objects::nonNull).toList();
        return new AiLogStatsResponse(
                kind,
                logs.size(),
                countStatus(logs, "DONE"),
                countStatus(logs, "EMPTY"),
                countStatus(logs, "FAILED"),
                (int) logs.stream().filter(entry -> entry.getUsedJson() != null).count(),
                scores.isEmpty() ? null : (int) Math.round(scores.stream().mapToInt(Integer::intValue).average().orElse(0)),
                durations.isEmpty() ? null : Math.round(durations.stream().mapToLong(Long::longValue).average().orElse(0))
        );
    }

    private static int countStatus(List<AiLog> logs, String status) {
        return (int) logs.stream().filter(entry -> status.equals(entry.getStatus())).count();
    }

    /**
     * Set: AI'nın önerdiği parça adlarıyla kaydedilen parça adlarının örtüşmesi (ortak / hepsi).
     * Kullanıcı bir adı düzeltirse, parça silip eklerse puan düşer. Ürün önerisi: önerilenlerin
     * kaçı seçilip eklendi. Ödeme planı yorumu bir yere kaydedilmediği için puanı yok.
     */
    private Integer score(AiLog entry) {
        if (entry.getUsedJson() == null || entry.getResultJson() == null) return null;
        try {
            JsonNode result = objectMapper.readTree(entry.getResultJson());
            JsonNode used = objectMapper.readTree(entry.getUsedJson());
            return switch (entry.getKind()) {
                case KIND_SET -> overlap(itemNames(result.path("items")), itemNames(used.path("items")));
                case KIND_PRODUCTS -> {
                    int offered = used.path("offered").size();
                    yield offered == 0 ? null : (int) Math.round(100.0 * used.path("selected").size() / offered);
                }
                default -> null;
            };
        } catch (IOException e) {
            return null;
        }
    }

    private static Set<String> itemNames(JsonNode items) {
        Set<String> names = new HashSet<>();
        items.forEach(item -> {
            String name = item.path("itemName").asText("").strip().toLowerCase(TR);
            if (!name.isEmpty()) names.add(name);
        });
        return names;
    }

    private static Integer overlap(Set<String> suggested, Set<String> saved) {
        Set<String> all = new HashSet<>(suggested);
        all.addAll(saved);
        if (all.isEmpty()) return null;
        long common = suggested.stream().filter(saved::contains).count();
        return (int) Math.round(100.0 * common / all.size());
    }

    private void update(UUID jobId, Consumer<AiLog> change) {
        try {
            aiLogRepository.findById(jobId).ifPresent(entry -> {
                change.accept(entry);
                aiLogRepository.save(entry);
            });
        } catch (Exception e) {
            log.warn("AI kaydı güncellenemedi: job={}", jobId, e);
        }
    }
}
