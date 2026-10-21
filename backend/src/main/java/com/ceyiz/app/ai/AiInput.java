package com.ceyiz.app.ai;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * AI'ya gidecek girdinin belleğe alınmış hali. MultipartFile'ın geçici dosyası istek bitince
 * silindiği için arka plandaki iş onu kullanamaz; baytlar istek sırasında okunur.
 */
public record AiInput(byte[] fileBytes, String contentType, String text) {

    public static AiInput from(MultipartFile file, String text) {
        try {
            boolean hasFile = file != null && !file.isEmpty();
            return new AiInput(
                    hasFile ? file.getBytes() : null,
                    hasFile ? file.getContentType() : null,
                    text == null ? "" : text.strip()
            );
        } catch (IOException e) {
            throw new IllegalArgumentException("Dosya okunamadı");
        }
    }

    public boolean hasFile() {
        return fileBytes != null && fileBytes.length > 0;
    }
}
