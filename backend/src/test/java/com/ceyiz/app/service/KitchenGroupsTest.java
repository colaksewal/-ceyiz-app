package com.ceyiz.app.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KitchenGroupsTest {

    private static String group(String name) {
        return KitchenGroups.classify(name).orElse(null);
    }

    @Test
    void classifiesTypicalKitchenItems() {
        assertThat(group("Tencere Seti")).isEqualTo(KitchenGroups.COOKING);
        assertThat(group("Fırın tepsisi")).isEqualTo(KitchenGroups.COOKING);
        assertThat(group("Çatal bıçak takımı")).isEqualTo(KitchenGroups.TABLEWARE);
        assertThat(group("6'lı su bardağı")).isEqualTo(KitchenGroups.TABLEWARE);
        assertThat(group("Çay bardağı")).isEqualTo(KitchenGroups.TEA_COFFEE);
        assertThat(group("ÇAYDANLIK")).isEqualTo(KitchenGroups.TEA_COFFEE);
        assertThat(group("Kesme tahtası")).isEqualTo(KitchenGroups.PREP);
        assertThat(group("Bulaşık makinesi")).isEqualTo(KitchenGroups.APPLIANCES);
        assertThat(group("Kahve makinesi")).isEqualTo(KitchenGroups.APPLIANCES);
        assertThat(group("Baharatlık")).isEqualTo(KitchenGroups.STORAGE);
        assertThat(group("Amerikan servis")).isEqualTo(KitchenGroups.TEXTILES);
        assertThat(group("Mutfak havlusu")).isEqualTo(KitchenGroups.TEXTILES);
        assertThat(group("Bulaşık süngeri")).isEqualTo(KitchenGroups.CLEANING);
    }

    @Test
    void unknownItemStaysUngrouped() {
        assertThat(KitchenGroups.classify("Duvar saati")).isEmpty();
        assertThat(KitchenGroups.classify("  ")).isEmpty();
        assertThat(KitchenGroups.classify(null)).isEmpty();
    }

    @Test
    void detectsKitchenCategoryCaseInsensitively() {
        assertThat(KitchenGroups.isKitchen("Mutfak")).isTrue();
        assertThat(KitchenGroups.isKitchen(" MUTFAK ")).isTrue();
        assertThat(KitchenGroups.isKitchen("Banyo")).isFalse();
    }

    @Test
    void validatesAgainstStandardList() {
        assertThat(KitchenGroups.isValid("Pişirme")).isTrue();
        assertThat(KitchenGroups.isValid("Başka")).isFalse();
    }
}
