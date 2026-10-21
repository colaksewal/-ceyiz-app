package com.ceyiz.app.dto;

import java.util.UUID;

/**
 * "Başlarken" kartının adımları; kullanıcının kendi listelerinden hesaplanır.
 * firstListId: adımlardaki bağlantılar için kullanıcının ilk listesi (yoksa null).
 */
public record OnboardingResponse(
        boolean hasList,
        boolean hasCategory,
        boolean hasProduct,
        boolean hasPriceEntry,
        boolean hasTeamMember,
        UUID firstListId
) {}
