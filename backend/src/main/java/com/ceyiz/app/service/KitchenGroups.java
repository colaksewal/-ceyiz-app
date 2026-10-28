package com.ceyiz.app.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Mutfak kategorisinin 4 standart alt kategorisi ve ürün adından grubu bulan kural tabanlı sınıflandırıcı.
 * Eşleşmeyen ürün gruplanmamış kalır; kullanıcı elle atar. Kurallar sırayla denenir, ilk eşleşen kazanır
 * (ör. "çay bardağı" Sofra'ya, "çaydanlık" Pişirme'ye, "kahve makinesi" Küçük Ev Aletleri'ne düşsün diye
 * özel kurallar genel olanlardan önce gelir).
 */
public final class KitchenGroups {

    public static final String COOKING = "Pişirme";
    public static final String APPLIANCES = "Küçük Ev Aletleri";
    public static final String TABLEWARE = "Sofra Ürünleri";
    public static final String UTENSILS = "Mutfak Gereçleri";

    public static final List<String> ALL = List.of(COOKING, APPLIANCES, TABLEWARE, UTENSILS);

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final String KITCHEN_CATEGORY = "mutfak";

    private record Rule(String group, List<String> keywords) {}

    // Türkçe ünsüz yumuşaması için (bardak/bardağı) k ile biten kelimelerin ğ'li kökü de yazılır.
    private static final List<Rule> RULES = List.of(
            new Rule(APPLIANCES, List.of("buzdolabı", "derin dondurucu", "bulaşık makine", "çamaşır makine",
                    "mikrodalga", "davlumbaz", "set üstü", "ankastre", "ocak", "ocağ", "blender", "mikser",
                    "mutfak robotu", "doğrayıcı", "rondo", "kettle", "su ısıtıcı", "çaycı", "air fryer", "airfryer",
                    "tost makine", "ekmek kızartma", "kahve makine", "çay makine", "meyve sıkacağ", "waffle",
                    "fritöz", "hamur karıştırıcı", "karıştırıcı", "yoğurma makine", "elektrikli")),
            new Rule(COOKING, List.of("tencere", "tava", "güveç", "düdüklü", "kek kalıb", "kurabiye", "pasta kalıb",
                    "fırın tepsisi", "sahan", "wok", "buharlı pişirici", "pişirme", "çaydanlık", "çaydanlığ",
                    "demlik", "demliğ", "cezve")),
            new Rule(TABLEWARE, List.of("yemek takımı", "kahvaltı takımı", "çatal", "kaşık", "kaşığ", "tabak", "tabağ",
                    "bardak", "bardağ", "fincan", "kupa", "mug", "kase", "servis", "sürahi", "şekerlik", "tuzluk",
                    "biberlik", "peçetelik", "peçete", "salata", "çorba", "tatlı", "sunum", "kek altlığ", "tepsi",
                    "yumurtalık", "sosluk", "yağlık", "sirkelik", "çerez", "ekmek sepeti", "masa örtü", "sofra bezi",
                    "runner", "çay", "kahve", "termos")),
            new Rule(UTENSILS, List.of("bıçak", "bıçağ", "makas", "rende", "doğrama", "süzgeç", "kevgir", "elek",
                    "eleğ", "havan", "maşa", "çırpıcı", "karıştırma", "kurutucu", "kavanoz", "organizer",
                    "düzenleyici", "buz kalıb", "havlu", "önlük", "sabunluk", "süpürge", "kesme tahtası", "merdane",
                    "açacak", "açacağ", "soyacak", "soyacağ", "ölçü", "terazi", "sıkacak", "sıkacağ", "spatula",
                    "kepçe", "oklava", "pasta torbası", "hamur", "saklama", "baharatlık", "kutu", "sepet", "raf",
                    "eldiven", "tutacak", "tutacağ", "kurulama bezi", "deterjan", "sünger", "paspas", "kova", "çöp",
                    "fırça", "askı", "vakum", "bulaşıklık", "kurutmalık", "temizlik", "mop", "sıvı sabun"))
    );

    private KitchenGroups() {}

    public static boolean isKitchen(String categoryName) {
        return categoryName != null && categoryName.trim().toLowerCase(TR).equals(KITCHEN_CATEGORY);
    }

    public static boolean isValid(String group) {
        return ALL.contains(group);
    }

    /** Ürün adından grubu bulur; hiçbir kural tutmazsa boş döner (gruplanmamış kalır). */
    public static Optional<String> classify(String productName) {
        if (productName == null || productName.isBlank()) {
            return Optional.empty();
        }
        String name = productName.trim().toLowerCase(TR);
        for (Rule rule : RULES) {
            for (String keyword : rule.keywords()) {
                if (name.contains(keyword)) {
                    return Optional.of(rule.group());
                }
            }
        }
        return Optional.empty();
    }
}
