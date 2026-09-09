package com.ceyiz.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;

/**
 * Yüklenen dosyaları (şimdilik sadece fiyat etiketi fotoğrafları) sunucunun diskinde
 * saklayan servis. Prod'da bu klasör, docker-compose.yml'de kalıcı bir volume'a
 * (uploads_data) mount edilir — container yeniden oluşturulsa da dosyalar kaybolmaz.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final Path uploadDir;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir) {
        this.uploadDir = Path.of(uploadDir);
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Upload klasörü oluşturulamadı: " + this.uploadDir, e);
        }
    }

    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Sadece JPEG, PNG ya da WEBP resim yüklenebilir");
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            default -> ".webp";
        };

        // Orijinal dosya adı hiç kullanılmıyor — hem çakışmaları hem path traversal riskini
        // baştan ortadan kaldırıyor.
        String filename = UUID.randomUUID() + extension;

        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(filename));
        } catch (IOException e) {
            throw new IllegalStateException("Dosya kaydedilemedi", e);
        }

        return "/uploads/" + filename;
    }

}
