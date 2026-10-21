package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiClient;
import com.ceyiz.app.ai.ImageDownscaler;
import com.ceyiz.app.ai.TextRecognizer;
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
import java.util.List;
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

    private final AiClient aiClient;
    private final TextRecognizer textRecognizer;
    private final ObjectMapper objectMapper;

    public Optional<ProductSuggestionResponse> suggestFromFile(MultipartFile file) {
        return suggest(file, "prompts/product-suggestion.txt", ProductSuggestionResponse.class);
    }

    /** Set ürün sayfası/kataloğundan set adı, marka, parçalar ve fiyatları çıkarır. */
    public Optional<SetTemplateSuggestionResponse> suggestSetFromFile(MultipartFile file) {
        return suggest(file, "prompts/set-suggestion.txt", SetTemplateSuggestionResponse.class)
                .map(this::sanitizeSetSuggestion);
    }

    private <T> Optional<T> suggest(MultipartFile file, String promptPath, Class<T> responseType) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz");
        }

        String contentType = file.getContentType();
        String promptTemplate = loadPromptTemplate(promptPath);
        Optional<String> aiResponse;

        if (contentType != null && IMAGE_CONTENT_TYPES.contains(contentType)) {
            aiResponse = suggestFromImage(file, promptTemplate);
        } else if (PDF_CONTENT_TYPE.equals(contentType)) {
            aiResponse = suggestFromPdf(file, promptTemplate);
        } else {
            throw new IllegalArgumentException("Sadece JPEG, PNG, WEBP resim ya da PDF yüklenebilir");
        }

        return aiResponse.flatMap(json -> parseResponse(json, responseType));
    }

    /**
     * Önce görseldeki yazı OCR ile okunur ve model sadece metinle çalışır (CPU'da görsel işlemekten
     * kat kat hızlı). Görselde yeterli yazı yoksa görsel modele gönderilir.
     */
    private Optional<String> suggestFromImage(MultipartFile file, String promptTemplate) {
        try {
            byte[] bytes = file.getBytes();
            Optional<String> recognizedText = textRecognizer.recognize(bytes);
            if (recognizedText.isPresent()) {
                String content = "Görselden OCR ile okunan yazı (harf hataları olabilir):\n" + recognizedText.get();
                return aiClient.complete(promptTemplate.replace("{{content}}", content));
            }

            String base64 = Base64.getEncoder().encodeToString(ImageDownscaler.downscale(bytes));
            String prompt = promptTemplate.replace("{{content}}", "Görsel ekte.");
            return aiClient.completeWithImage(prompt, base64);
        } catch (IOException e) {
            log.error("Görsel okunamadı", e);
            return Optional.empty();
        }
    }

    private Optional<String> suggestFromPdf(MultipartFile file, String promptTemplate) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            String text = new PDFTextStripper().getText(document);
            if (text.isBlank()) {
                log.warn("PDF'den metin çıkarılamadı (muhtemelen taranmış görsel PDF)");
                return Optional.empty();
            }
            String prompt = promptTemplate.replace("{{content}}", text);
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
