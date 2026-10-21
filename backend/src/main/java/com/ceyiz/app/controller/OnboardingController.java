package com.ceyiz.app.controller;

import com.ceyiz.app.dto.OnboardingResponse;
import com.ceyiz.app.entity.TrousseauList;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ListRepository;
import com.ceyiz.app.repository.ListShareRepository;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * "Başlarken" kartı için kullanıcının kendi listelerinde hangi adımları yaptığı. Sadece okuma
 * yaptığı ve tek ekrana hizmet ettiği için ayrı servis yerine doğrudan repository'leri kullanır.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/onboarding")
public class OnboardingController {

    private final ListRepository listRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PriceEntryRepository priceEntryRepository;
    private final ListShareRepository listShareRepository;

    @GetMapping
    public ResponseEntity<OnboardingResponse> status(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        List<TrousseauList> lists = listRepository.findByOwnerId(userId).stream()
                .sorted(Comparator.comparing(TrousseauList::getCreatedAt))
                .toList();
        if (lists.isEmpty()) {
            return ResponseEntity.ok(new OnboardingResponse(false, false, false, false, false, null));
        }

        List<UUID> listIds = lists.stream().map(TrousseauList::getId).toList();
        return ResponseEntity.ok(new OnboardingResponse(
                true,
                categoryRepository.existsByListIdIn(listIds),
                productRepository.existsInLists(listIds),
                priceEntryRepository.existsInLists(listIds),
                listShareRepository.existsByListIdIn(listIds),
                lists.get(0).getId()
        ));
    }
}
