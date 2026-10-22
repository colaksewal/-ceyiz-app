package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiClient;
import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.ai.ImageDownscaler;
import com.ceyiz.app.dto.PaymentPlanAdviceResponse;
import com.ceyiz.app.dto.ProductSuggestionResponse;
import com.ceyiz.app.dto.SetTemplateSuggestionResponse;
import com.ceyiz.app.entity.PriceType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Foto/PDF'den öneri çıkarır — hiçbir şeyi kalıcı olarak yazmaz, sadece öneriyi döner.
 * Öneriyi nereye yazacağı (admin şablonlarına mı, kullanıcının kendi listesine mi) çağıran
 * taraf zaten kendi yetki kontrolüne göre karar veriyor.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSuggestionService {

    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final int MAX_TEXT_LENGTH = 10_000;

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    /**
     * Girdiyi istek sırasında doğrulayıp belleğe alır. Hatalı girdi (boş, çok uzun, desteklenmeyen
     * dosya) arka plana hiç gitmez; kullanıcı hatayı hemen görür.
     */
    public AiInput prepare(MultipartFile file, String text) {
        AiInput input = AiInput.from(file, text);
        if (!input.hasFile() && input.text().isEmpty()) {
            throw new IllegalArgumentException("Dosya yükle ya da metin gir");
        }
        if (input.text().length() > MAX_TEXT_LENGTH) {
            throw new IllegalArgumentException("Metin en fazla " + MAX_TEXT_LENGTH + " karakter olabilir");
        }
        if (input.hasFile() && !isImage(input.contentType()) && !PDF_CONTENT_TYPE.equals(input.contentType())) {
            throw new IllegalArgumentException("Sadece JPEG, PNG, WEBP resim ya da PDF yüklenebilir");
        }
        return input;
    }

    public Optional<ProductSuggestionResponse> suggest(AiInput input) {
        return suggest(input, "prompts/product-suggestion.txt", ProductSuggestionResponse.class);
    }

    /** Set ürün sayfası/kataloğundan set adı, marka, parçalar ve fiyatları çıkarır. */
    public Optional<SetTemplateSuggestionResponse> suggestSet(AiInput input) {
        return suggest(input, "prompts/set-suggestion.txt", SetTemplateSuggestionResponse.class)
                .map(this::sanitizeSetSuggestion)
                .map(suggestion -> input.text().isEmpty() ? suggestion : useSourceNames(suggestion, input.text()));
    }

    /**
     * Parça adlarını kullanıcının yazdığı satırlardan harfi harfine alır (bkz. SourceLineMatcher).
     * İki parça aynı satıra denk gelirse model aynı ürünü iki kez yazmış demektir; tek satır kalır.
     */
    private SetTemplateSuggestionResponse useSourceNames(SetTemplateSuggestionResponse suggestion, String sourceText) {
        SourceLineMatcher matcher = new SourceLineMatcher(sourceText);
        Map<String, SetTemplateSuggestionResponse.Item> byName = new LinkedHashMap<>();
        for (SetTemplateSuggestionResponse.Item item : suggestion.items()) {
            String name = matcher.match(item.itemName(), suggestion.brand()).orElse(item.itemName());
            byName.putIfAbsent(name.toLowerCase(),
                    new SetTemplateSuggestionResponse.Item(name, item.quantity(), item.estimatedSeparatePrice()));
        }
        return new SetTemplateSuggestionResponse(suggestion.name(), suggestion.brand(),
                List.copyOf(byName.values()), suggestion.prices());
    }

    /**
     * Kodla hesaplanmış ödeme planına yorum yazar (girdi: PlanAdviceText). Boş öneriler atılır,
     * en fazla 5 öneri tutulur; özet de öneri de yoksa "AI bir şey çıkaramadı" sayılır.
     */
    public Optional<PaymentPlanAdviceResponse> advisePaymentPlan(AiInput input) {
        return suggest(input, "prompts/payment-plan-advice.txt", PaymentPlanAdviceResponse.class)
                .map(raw -> new PaymentPlanAdviceResponse(
                        raw.summary() == null || raw.summary().isBlank() ? null : raw.summary().trim(),
                        raw.tips() == null ? List.of() : raw.tips().stream()
                                .filter(tip -> tip != null && !tip.isBlank())
                                .map(String::trim)
                                .limit(5)
                                .toList()
                ))
                .filter(advice -> advice.summary() != null || !advice.tips().isEmpty());
    }

    /**
     * Dosya, metin ya da ikisi birden gelebilir. Sadece metin gelirse model görselsiz çalışır (CPU'da
     * görsele göre çok daha hızlı); dosyayla birlikte gelirse metin, içeriğin yanına not olarak eklenir.
     */
    private <T> Optional<T> suggest(AiInput input, String promptPath, Class<T> responseType) {
        String note = input.text();
        String promptTemplate = loadPromptTemplate(promptPath);
        Optional<String> aiResponse;

        if (!input.hasFile()) {
            aiResponse = aiClient.complete(promptTemplate.replace("{{content}}", note));
        } else if (isImage(input.contentType())) {
            aiResponse = suggestFromImage(input.fileBytes(), note, promptTemplate);
        } else {
            aiResponse = suggestFromPdf(input.fileBytes(), note, promptTemplate);
        }

        return aiResponse.flatMap(json -> parseResponse(json, responseType));
    }

    private static boolean isImage(String contentType) {
        return contentType != null && IMAGE_CONTENT_TYPES.contains(contentType);
    }

    private static String withNote(String content, String note) {
        return note.isEmpty() ? content : content + "\n\nKullanıcının notu:\n" + note;
    }

    private Optional<String> suggestFromImage(byte[] bytes, String note, String promptTemplate) {
        String base64 = Base64.getEncoder().encodeToString(ImageDownscaler.downscale(bytes));
        String prompt = promptTemplate.replace("{{content}}", withNote("Görsel ekte.", note));
        return aiClient.completeWithImage(prompt, base64);
    }

    private Optional<String> suggestFromPdf(byte[] bytes, String note, String promptTemplate) {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            String text = new PDFTextStripper().getText(document);
            if (text.isBlank()) {
                log.warn("PDF'den metin çıkarılamadı (muhtemelen taranmış görsel PDF)");
                return Optional.empty();
            }
            String prompt = promptTemplate.replace("{{content}}", withNote(text, note));
            return aiClient.complete(prompt);
        } catch (IOException e) {
            log.error("PDF okunamadı", e);
            return Optional.empty();
        }
    }

    private String loadPromptTemplate(String path) {
        try {
            return new String(new ClassPathResource(path).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(path + " prompt şablonu okunamadı", e);
        }
    }

    private <T> Optional<T> parseResponse(String json, Class<T> responseType) {
        try {
            return Optional.of(objectMapper.readValue(json, responseType));
        } catch (IOException e) {
            log.warn("AI yanıtı beklenen JSON formatında değil: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Küçük modeller kurallara her zaman uymuyor: adı boş parçalar atılır, adedi olmayan/0 olan
     * parça 1 sayılır, geçersiz ödeme tipli ya da tutarı eksik fiyat satırları elenir. Böylece
     * form, backend doğrulamasından geçecek veriyle dolar.
     */
    private SetTemplateSuggestionResponse sanitizeSetSuggestion(SetTemplateSuggestionResponse raw) {
        List<SetTemplateSuggestionResponse.Item> items = raw.items() == null ? List.of() : raw.items().stream()
                .filter(item -> item != null && item.itemName() != null && !item.itemName().isBlank())
                .map(item -> new SetTemplateSuggestionResponse.Item(
                        item.itemName().trim(),
                        item.quantity() == null || item.quantity() <= 0 ? 1 : item.quantity(),
                        positiveOrNull(item.estimatedSeparatePrice())
                ))
                .toList();

        List<SetTemplateSuggestionResponse.Price> prices = raw.prices() == null ? List.of() : raw.prices().stream()
                .filter(price -> price != null && parsePriceType(price.priceType()) != null)
                .map(price -> new SetTemplateSuggestionResponse.Price(
                        parsePriceType(price.priceType()).name(),
                        positiveOrNull(price.cashPrice()),
                        price.installmentCount() == null || price.installmentCount() <= 0 ? null : price.installmentCount(),
                        positiveOrNull(price.installmentAmount())
                ))
                .filter(price -> PriceType.TAKSITLI.name().equals(price.priceType())
                        ? price.installmentCount() != null && price.installmentAmount() != null
                        : price.cashPrice() != null)
                .toList();

        return new SetTemplateSuggestionResponse(
                raw.name() == null ? null : raw.name().trim(),
                raw.brand() == null || raw.brand().isBlank() ? null : raw.brand().trim(),
                items,
                prices
        );
    }

    private static PriceType parsePriceType(String value) {
        if (value == null) return null;
        try {
            return PriceType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static BigDecimal positiveOrNull(BigDecimal value) {
        return value != null && value.signum() > 0 ? value : null;
    }
}
