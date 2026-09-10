package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiClient;
import com.ceyiz.app.dto.ProductSuggestionResponse;
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
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;

/**
 * Foto/PDF'den kategori+ürün önerisi çıkarır — hiçbir şeyi kalıcı olarak yazmaz, sadece
 * öneriyi döner. Öneriyi nereye yazacağı (admin şablonlarına mı, kullanıcının kendi
 * listesine mi) çağıran taraf zaten kendi yetki kontrolüne göre karar veriyor.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSuggestionService {

    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    public Optional<ProductSuggestionResponse> suggestFromFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz");
        }

        String contentType = file.getContentType();
        Optional<String> aiResponse;

        if (contentType != null && IMAGE_CONTENT_TYPES.contains(contentType)) {
            aiResponse = suggestFromImage(file);
        } else if (PDF_CONTENT_TYPE.equals(contentType)) {
            aiResponse = suggestFromPdf(file);
        } else {
            throw new IllegalArgumentException("Sadece JPEG, PNG, WEBP resim ya da PDF yüklenebilir");
        }

        return aiResponse.flatMap(this::parseResponse);
    }

    private Optional<String> suggestFromImage(MultipartFile file) {
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String prompt = loadPromptTemplate().replace("{{content}}", "Görsel ekte.");
            return aiClient.completeWithImage(prompt, base64);
        } catch (IOException e) {
            log.error("Görsel okunamadı", e);
            return Optional.empty();
        }
    }

    private Optional<String> suggestFromPdf(MultipartFile file) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            String text = new PDFTextStripper().getText(document);
            if (text.isBlank()) {
                log.warn("PDF'den metin çıkarılamadı (muhtemelen taranmış görsel PDF)");
                return Optional.empty();
            }
            String prompt = loadPromptTemplate().replace("{{content}}", text);
            return aiClient.complete(prompt);
        } catch (IOException e) {
            log.error("PDF okunamadı", e);
            return Optional.empty();
        }
    }

    private String loadPromptTemplate() {
        try {
            return new String(
                    new ClassPathResource("prompts/product-suggestion.txt").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8
            );
        } catch (IOException e) {
            throw new IllegalStateException("product-suggestion prompt şablonu okunamadı", e);
        }
    }

    private Optional<ProductSuggestionResponse> parseResponse(String json) {
        try {
            return Optional.of(objectMapper.readValue(json, ProductSuggestionResponse.class));
        } catch (IOException e) {
            log.warn("AI yanıtı beklenen JSON formatında değil: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
