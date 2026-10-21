package com.ceyiz.app.ai;

import lombok.extern.slf4j.Slf4j;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Görseli modele göndermeden önce küçültür: telefon/ekran görüntüleri 2000+ px olabiliyor,
 * model ise görseli zaten kendi sabit çözünürlüğüne indiriyor. Büyük görseli base64 olarak
 * taşımak ve Ollama'da çözmek boşa zaman. Okunamayan formatta (ör. WEBP — ImageIO varsayılan
 * olarak desteklemez) orijinal bayt döner, akış bozulmaz.
 */
@Slf4j
public final class ImageDownscaler {

    private static final int MAX_SIDE = 1024;

    private ImageDownscaler() {}

    public static byte[] downscale(byte[] original) {
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(original));
            if (source == null) {
                return original;
            }

            int width = source.getWidth();
            int height = source.getHeight();
            double scale = Math.min(1.0, (double) MAX_SIDE / Math.max(width, height));
            int targetWidth = (int) Math.round(width * scale);
            int targetHeight = (int) Math.round(height * scale);

            // JPEG'e çevirirken şeffaf (PNG) alanlar siyah olmasın diye beyaz zemin.
            BufferedImage target = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = target.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, targetWidth, targetHeight);
            g.drawImage(source, 0, 0, targetWidth, targetHeight, null);
            g.dispose();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(target, "jpg", out);
            byte[] result = out.toByteArray();

            log.info("Görsel küçültüldü: {}x{} → {}x{}, {} KB → {} KB",
                    width, height, targetWidth, targetHeight, original.length / 1024, result.length / 1024);
            return result.length < original.length ? result : original;
        } catch (IOException | RuntimeException e) {
            log.warn("Görsel küçültülemedi, orijinali gönderiliyor: {}", e.getMessage());
            return original;
        }
    }
}
