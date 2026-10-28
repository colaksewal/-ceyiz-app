package com.ceyiz.app.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Mutfak kategorisinin standart alt grupları ve ürün adından grubu bulan kural tabanlı sınıflandırıcı.
 * Eşleşmeyen ürün gruplanmamış kalır; kullanıcı elle atar. Kurallar sırayla denenir, ilk eşleşen kazanır
 * (ör. "çatal bıçak takımı" Hazırlık'taki "bıçak"a düşmesin diye Sofra kuralı önce gelir).
 * Frontend'deki lib/productGroups.ts ile aynı liste ve yazım tutulmalı.
 */
public final class KitchenGroups {

    public static final String COOKING = "Pişirme";
    public static final String PREP = "Hazırlık Gereçleri";
    public static final String TABLEWARE = "Sofra & Servis";
    public static final String TEA_COFFEE = "Çay & Kahve";
    public static final String APPLIANCES = "Beyaz Eşya & Küçük Ev Aletleri";
    public static final String STORAGE = "Saklama & Düzen";
    public static final String TEXTILES = "Mutfak Tekstili";
    public static final String CLEANING = "Temizlik";

    public static final List<String> ALL = List.of(
            COOKING, PREP, TABLEWARE, TEA_COFFEE, APPLIANCES, STORAGE, TEXTILES, CLEANING
    );

    private static final Locale TR = Locale.forLanguageTag("tr");
    private static final String KITCHEN_CATEGORY = "mutfak";

    private record Rule(String group, List<String> keywords) {}

    private static final List<Rule> RULES = List.of(
            new Rule(APPLIANCES, List.of("buzdolabı", "derin dondurucu", "bulaşık makine", "çamaşır makine",
                    "mikrodalga", "davlumbaz", "set üstü", "ankastre", "ocak", "ocağ", "blender", "mikser", "mutfak robotu",
                    "doğrayıcı", "rondo", "kettle", "su ısıtıcı", "air fryer", "airfryer", "tost makine",
                    "ekmek kızartma", "kahve makine", "çay makine", "meyve sıkacağ", "izgara", "waffle",
                    "fritöz", "yoğurma makine")),
            new Rule(TEXTILES, List.of("amerikan servis", "masa örtüsü", "runner", "mutfak havlusu", "kurulama bezi",
                    "eldiven", "önlük", "tutacak", "tutacağ", "peçete", "mutfak perdesi", "sandalye minderi", "kilim")),
            new Rule(TEA_COFFEE, List.of("çay", "kahve", "fincan", "cezve", "demlik", "demliğ", "french press", "kupa", "mug",
                    "termos", "nescafe")),
            new Rule(COOKING, List.of("tencere", "tava", "güveç", "düdüklü", "kek kalıbı", "fırın tepsisi",
                    "sahan", "wok", "buharlı pişirici", "pişirme")),
            new Rule(TABLEWARE, List.of("yemek takımı", "kahvaltı takımı", "çatal", "kaşık", "kaşığ", "tabak", "tabağ", "bardak", "bardağ", "kase",
                    "servis", "sürahi", "şekerlik", "tuzluk", "biberlik", "peçetelik", "salata", "çorba", "tatlı",
                    "sunum", "kek altlığı", "tepsi", "yumurtalık", "sosluk")),
            new Rule(CLEANING, List.of("deterjan", "sünger", "paspas", "kova", "çöp", "sabunluk", "kağıt havlu",
                    "bulaşık teli", "bulaşık fırçası", "temizlik", "süpürge", "mop", "sıvı sabun")),
            new Rule(STORAGE, List.of("saklama", "kavanoz", "baharatlık", "ekmek kutusu", "şeker kutusu", "organizer",
                    "düzenleyici", "raf", "kutu", "sepet", "vakum", "bulaşıklık", "kurutmalık", "askı")),
            new Rule(PREP, List.of("bıçak", "bıçağ", "kesme tahtası", "rende", "doğrama", "süzgeç", "süzgeci", "kevgir", "karıştırma",
                    "merdane", "açacak", "açacağ", "soyacak", "soyacağ", "ölçü", "terazi", "elek", "eleğ", "havan", "sıkacak", "sıkacağ", "makas", "çırpıcı",
                    "spatula", "kepçe", "maşa", "oklava", "pasta torbası", "hamur"))
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
