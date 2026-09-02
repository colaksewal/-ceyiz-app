package com.ceyiz.app;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aşama 3'ün tek amacı: Docker ortamının (Postgres + backend + frontend)
 * gerçekten ayağa kalktığını kanıtlamak. Gerçek domain endpoint'leri Aşama 4'te
 * bu iskeletin üzerine eklenecek.
 */
@RestController
public class PingController {

    @GetMapping("/api/ping")
    public Map<String, String> ping() {
        return Map.of("status", "ok", "service", "ceyiz-backend");
    }
}
