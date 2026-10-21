package com.ceyiz.app.service;

import com.ceyiz.app.dto.CreateSetTemplateItemRequest;
import com.ceyiz.app.dto.CreateSetTemplatePriceRequest;
import com.ceyiz.app.dto.CreateSetTemplateRequest;
import com.ceyiz.app.dto.SetTemplateItemResponse;
import com.ceyiz.app.dto.SetTemplatePriceResponse;
import com.ceyiz.app.dto.SetTemplateResponse;
import com.ceyiz.app.dto.SetTemplateSuggestionResponse;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.SetTemplate;
import com.ceyiz.app.entity.SetTemplateItem;
import com.ceyiz.app.entity.SetTemplatePrice;
import com.ceyiz.app.repository.SetTemplateItemRepository;
import com.ceyiz.app.repository.SetTemplatePriceRepository;
import com.ceyiz.app.repository.SetTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SetTemplateService {

    private final SetTemplateRepository setTemplateRepository;
    private final SetTemplateItemRepository setTemplateItemRepository;
    private final SetTemplatePriceRepository setTemplatePriceRepository;
    private final AdminAccessService adminAccessService;
    private final AiSuggestionService aiSuggestionService;

    public List<SetTemplateResponse> getAllSetTemplates(UUID adminId) {
        adminAccessService.requireAdmin(adminId);
        return setTemplateRepository.findAllByOrderByDisplayOrder().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Set, parçaları ve fiyatları tek transaction'da yazılır: örn. 3. fiyat satırı
     * doğrulamadan geçemezse daha önce kaydedilen set ve parçalar da geri alınır,
     * DB'de yarım kalmış (parçasız/fiyatsız) bir set oluşmaz.
     */
    @Transactional
    public SetTemplateResponse createSetTemplate(UUID adminId, CreateSetTemplateRequest request) {
        adminAccessService.requireAdmin(adminId);

        if (isBlank(request.name())) {
            throw new IllegalArgumentException("Set adı boş olamaz");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Set en az bir parça içermeli");
        }

        SetTemplate setTemplate = setTemplateRepository.save(
                new SetTemplate(request.name().trim(), blankToNull(request.brand()), request.displayOrder())
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

        return toResponse(setTemplate);
    }

    /** AI önerisi sadece formu doldurur; kayıt yine createSetTemplate'ten (ve doğrulamasından) geçer. */
    public Optional<SetTemplateSuggestionResponse> suggestFromFile(UUID adminId, MultipartFile file) {
        adminAccessService.requireAdmin(adminId);
        return aiSuggestionService.suggestSetFromFile(file);
    }

    public void deleteSetTemplate(UUID adminId, UUID setTemplateId) {
        adminAccessService.requireAdmin(adminId);
        // Parçalar ve fiyatlar DB'deki ON DELETE CASCADE ile birlikte silinir.
        setTemplateRepository.deleteById(setTemplateId);
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

    private SetTemplateResponse toResponse(SetTemplate setTemplate) {
        List<SetTemplateItemResponse> items =
                setTemplateItemRepository.findBySetTemplateIdOrderByDisplayOrder(setTemplate.getId()).stream()
                        .map(SetTemplateItemResponse::from)
                        .toList();
        List<SetTemplatePriceResponse> prices =
                setTemplatePriceRepository.findBySetTemplateIdOrderByDisplayOrder(setTemplate.getId()).stream()
                        .map(SetTemplatePriceResponse::from)
                        .toList();
        return SetTemplateResponse.from(setTemplate, items, prices);
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
