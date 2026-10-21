package com.ceyiz.app.service;

import com.ceyiz.app.ai.AiInput;
import com.ceyiz.app.dto.CreateSetTemplateItemRequest;
import com.ceyiz.app.dto.CreateSetTemplatePriceRequest;
import com.ceyiz.app.dto.CreateSetTemplateRequest;
import com.ceyiz.app.dto.SetTemplateItemResponse;
import com.ceyiz.app.dto.SetTemplatePriceResponse;
import com.ceyiz.app.dto.SetTemplateResponse;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.SetTemplate;
import com.ceyiz.app.entity.SetTemplateItem;
import com.ceyiz.app.entity.SetTemplatePrice;
import com.ceyiz.app.entity.User;
import com.ceyiz.app.repository.SetTemplateItemRepository;
import com.ceyiz.app.repository.SetTemplatePriceRepository;
import com.ceyiz.app.repository.SetTemplateRepository;
import com.ceyiz.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Setleri herkes oluşturabilir. Admin'in setleri herkese görünen ortak katalogdur;
 * normal kullanıcının seti sadece kendisine görünür ve sadece kendisi silebilir.
 */
@Service
@RequiredArgsConstructor
public class SetTemplateService {

    private final SetTemplateRepository setTemplateRepository;
    private final SetTemplateItemRepository setTemplateItemRepository;
    private final SetTemplatePriceRepository setTemplatePriceRepository;
    private final UserRepository userRepository;
    private final AiSuggestionService aiSuggestionService;
    private final AiJobService aiJobService;

    public List<SetTemplateResponse> getAllSetTemplates(UUID userId) {
        User user = findUser(userId);
        return setTemplateRepository.findVisibleTo(userId).stream()
                .map(setTemplate -> toResponse(setTemplate, user))
                .toList();
    }

    /**
     * Set, parçaları ve fiyatları tek transaction'da yazılır: örn. 3. fiyat satırı
     * doğrulamadan geçemezse daha önce kaydedilen set ve parçalar da geri alınır,
     * DB'de yarım kalmış (parçasız/fiyatsız) bir set oluşmaz.
     */
    @Transactional
    public SetTemplateResponse createSetTemplate(UUID userId, CreateSetTemplateRequest request) {
        User user = findUser(userId);

        if (isBlank(request.name())) {
            throw new IllegalArgumentException("Set adı boş olamaz");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Set en az bir parça içermeli");
        }
        String imageUrl = blankToNull(request.imageUrl());
        // Sadece kendi upload'larımız: kartta dışarıdan rastgele bir adres gösterilmesin.
        if (imageUrl != null && !imageUrl.startsWith("/uploads/")) {
            throw new IllegalArgumentException("Geçersiz görsel adresi");
        }

        SetTemplate setTemplate = setTemplateRepository.save(
                new SetTemplate(request.name().trim(), blankToNull(request.brand()), imageUrl,
                        request.displayOrder(), userId, user.isAdmin())
        );

        List<CreateSetTemplateItemRequest> items = request.items();
        for (int i = 0; i < items.size(); i++) {
            CreateSetTemplateItemRequest item = items.get(i);
            validateItem(item);
            setTemplateItemRepository.save(new SetTemplateItem(
                    setTemplate.getId(),
                    item.itemName().trim(),
                    item.quantity(),
                    i,
                    item.estimatedSeparatePrice(),
                    blankToNull(item.note())
            ));
        }

        List<CreateSetTemplatePriceRequest> prices = request.prices() == null ? List.of() : request.prices();
        for (int i = 0; i < prices.size(); i++) {
            CreateSetTemplatePriceRequest price = prices.get(i);
            validatePrice(price);
            setTemplatePriceRepository.save(new SetTemplatePrice(
                    setTemplate.getId(),
                    blankToNull(price.storeName()),
                    price.priceType(),
                    price.cashPrice(),
                    price.installmentCount(),
                    price.installmentAmount(),
                    blankToNull(price.paymentPlanNote()),
                    i
            ));
        }

        return toResponse(setTemplate, user);
    }

    /**
     * AI önerisi sadece formu doldurur; kayıt yine createSetTemplate'ten (ve doğrulamasından) geçer.
     * Arka planda çalışır, iş kimliği döner.
     */
    public UUID suggest(UUID userId, MultipartFile file, String text) {
        findUser(userId);
        AiInput input = aiSuggestionService.prepare(file, text);
        return aiJobService.submit(userId, () -> aiSuggestionService.suggestSet(input));
    }

    public void deleteSetTemplate(UUID userId, UUID setTemplateId) {
        User user = findUser(userId);
        SetTemplate setTemplate = setTemplateRepository.findById(setTemplateId)
                .orElseThrow(() -> new IllegalArgumentException("Set bulunamadı"));
        if (!canDelete(setTemplate, user)) {
            throw new SecurityException("Bu seti silme yetkiniz yok");
        }
        // Parçalar ve fiyatlar DB'deki ON DELETE CASCADE ile birlikte silinir.
        setTemplateRepository.delete(setTemplate);
    }

    // Admin ortak setleri yönetir; herkes kendi setini silebilir. Admin başkasının özel setini
    // zaten göremez, dolayısıyla silemez.
    private static boolean canDelete(SetTemplate setTemplate, User user) {
        if (setTemplate.isCreatedByAdmin()) {
            return user.isAdmin();
        }
        return user.getId().equals(setTemplate.getCreatedBy());
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
    }

    private void validateItem(CreateSetTemplateItemRequest item) {
        if (isBlank(item.itemName())) {
            throw new IllegalArgumentException("Parça adı boş olamaz");
        }
        if (item.quantity() <= 0) {
            throw new IllegalArgumentException("Parça adedi en az 1 olmalı: " + item.itemName());
        }
        if (isNegative(item.estimatedSeparatePrice())) {
            throw new IllegalArgumentException("Parça fiyatı negatif olamaz: " + item.itemName());
        }
    }

    /**
     * Taksitli fiyatta taksit sayısı + tutarı zorunlu, cashPrice (toplam) opsiyonel;
     * peşin ve elden kredi kartında cashPrice zorunlu.
     */
    private void validatePrice(CreateSetTemplatePriceRequest price) {
        if (price.priceType() == null) {
            throw new IllegalArgumentException("Ödeme tipi seçilmeli");
        }
        if (price.priceType() == PriceType.TAKSITLI) {
            if (price.installmentCount() == null || price.installmentCount() <= 0) {
                throw new IllegalArgumentException("Taksitli fiyatta taksit sayısı girilmeli");
            }
            if (price.installmentAmount() == null || price.installmentAmount().signum() <= 0) {
                throw new IllegalArgumentException("Taksitli fiyatta taksit tutarı girilmeli");
            }
        } else if (price.cashPrice() == null) {
            throw new IllegalArgumentException("Fiyat girilmeli");
        }
        if (isNegative(price.cashPrice())) {
            throw new IllegalArgumentException("Fiyat negatif olamaz");
        }
    }

    private SetTemplateResponse toResponse(SetTemplate setTemplate, User viewer) {
        List<SetTemplateItemResponse> items =
                setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(setTemplate.getId()).stream()
                        .map(SetTemplateItemResponse::from)
                        .toList();
        List<SetTemplatePriceResponse> prices =
                setTemplatePriceRepository.findBySetTemplateIdOrderByDisplayOrder(setTemplate.getId()).stream()
                        .map(SetTemplatePriceResponse::from)
                        .toList();
        return SetTemplateResponse.from(setTemplate, canDelete(setTemplate, viewer), items, prices);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static boolean isNegative(BigDecimal value) {
        return value != null && value.signum() < 0;
    }
}
