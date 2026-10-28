package com.ceyiz.app.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KitchenGroupsTest {

    private static String group(String name) {
        return KitchenGroups.classify(name).orElse(null);
    }

    private static void assertAll(String expected, List<String> names) {
        for (String name : names) {
            assertThat(group(name)).as(name).isEqualTo(expected);
        }
    }

    @Test
    void cookingItems() {
        assertAll(KitchenGroups.COOKING, List.of("Düdüklü", "Sos tava", "Kek kalıbı", "Kek/kurabiye kalıpları",
                "Çaydanlık", "Tencere Seti", "Fırın tepsisi"));
    }

    @Test
    void applianceItems() {
        assertAll(KitchenGroups.APPLIANCES, List.of("Mikrodalga", "Tost makinesi", "Hamur karıştırıcı",
                "Filtre kahve makinesi", "Çaycı/kettle", "Buzdolabı", "Bulaşık makinesi"));
    }

    @Test
    void tablewareItems() {
        assertAll(KitchenGroups.TABLEWARE, List.of("Servis tabakları", "Tepsi", "Kaseler", "Çatal-kaşık setleri",
                "Çay bardakları", "Kahve fincanları", "Çerez seti", "Ekmek sepeti", "Tuzluk", "Sosluklar", "Yağlık",
                "Masa örtüleri", "Sofra bezi", "Yağlık - sirkelik", "Çatal bıçak takımı", "6'lı su bardağı"));
    }

    @Test
    void utensilItems() {
        assertAll(KitchenGroups.UTENSILS, List.of("Bıçak seti", "Makas", "Rende", "Süzgeçler", "Elek", "Havan",
                "Maşa", "Çırpıcı", "Karıştırma kabı", "Sebze kurutucu", "Kavanozlar", "Organizerler", "Buz kalıbı",
                "Havlular", "Önlük", "Sabunluk", "Süpürge", "Kesme tahtası", "Bulaşık süngeri"));
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
        assertThat(KitchenGroups.ALL).hasSize(4);
        assertThat(KitchenGroups.isValid("Pişirme")).isTrue();
        assertThat(KitchenGroups.isValid("Hazırlık Gereçleri")).isFalse();
    }
}
