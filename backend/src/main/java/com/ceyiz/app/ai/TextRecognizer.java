package com.ceyiz.app.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Görseldeki yazıyı Tesseract (komut satırı) ile okur. Sunucuda GPU yok; görsel modelin görseli
 * işlemesi ~45 sn sürerken OCR 1-3 sn, metni işlemek de görsele göre çok daha hızlı. Ürün sayfası
 * ve katalog görselleri zaten büyük ölçüde yazı olduğundan çoğu durumda metin yeterli.
 * Tesseract kurulu değilse (ör. yerel geliştirme) ya da görselde yeterli yazı yoksa boş döner,
 * çağıran taraf görsel modele geri düşer.
 */
@Slf4j
@Component
public class TextRecognizer {

    private static final long TIMEOUT_SECONDS = 30;
    // Bu kadar harf/rakam yoksa görselde okunacak yazı yok sayılır (ör. sadece ürün fotoğrafı).
    private static final int MIN_MEANINGFUL_CHARS = 40;

    public Optional<String> recognize(byte[] image) {
        long start = System.nanoTime();
        Process process = null;
        try {
            process = new ProcessBuilder("tesseract", "stdin", "stdout", "-l", "tur+eng")
                    .redirectError(ProcessBuilder.Redirect.DISCARD)
                    .start();
            Process running = process;
            CompletableFuture<byte[]> output = CompletableFuture.supplyAsync(() -> readAll(running));
            try (OutputStream stdin = process.getOutputStream()) {
                stdin.write(image);
            }

            String text = new String(output.get(TIMEOUT_SECONDS, TimeUnit.SECONDS), StandardCharsets.UTF_8).strip();
            if (!process.waitFor(5, TimeUnit.SECONDS) || process.exitValue() != 0) {
                log.warn("OCR başarısız oldu, görsel modele geçiliyor");
                return Optional.empty();
            }

            long meaningfulChars = text.codePoints().filter(Character::isLetterOrDigit).count();
            log.info("OCR {} sn: {} harf/rakam okundu", String.format("%.1f", (System.nanoTime() - start) / 1_000_000_000.0),
                    meaningfulChars);
            return meaningfulChars >= MIN_MEANINGFUL_CHARS ? Optional.of(text) : Optional.empty();
        } catch (IOException e) {
            log.warn("OCR çalıştırılamadı (tesseract kurulu mu?): {}", e.getMessage());
            return Optional.empty();
        } catch (TimeoutException | ExecutionException e) {
            log.warn("OCR başarısız oldu, görsel modele geçiliyor: {}", e.getMessage());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    private static byte[] readAll(Process process) {
        try {
            return process.getInputStream().readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
