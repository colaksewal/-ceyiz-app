package com.ceyiz.app.service;

import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Admin yetkisi kontrolünün tek toplandığı yer — ListAccessService'in admin karşılığı.
 * Admin paneline hizmet eden servisler (ör. TemplateService) bunu kullanır.
 */
@Service
@RequiredArgsConstructor
public class AdminAccessService {

    private final UserRepository userRepository;

    public void requireAdmin(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
        if (!user.isAdmin()) {
            throw new SecurityException("Bu işlem için admin yetkisi gerekiyor");
        }
    }
}
