package com.ceyiz.app.service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Küçük model ürün adlarındaki kelimelerin sırasını değiştirebiliyor ("Vintage Coffeebreak 5026H
 * Filtre Kahve Makinesi" → "Filtre Kahve Makinesi 5026H"). Kullanıcı ürünleri metin olarak
 * yapıştırdıysa, AI'nın adındaki her kelimeyi içeren satır bulunur ve ad o satırdan harfi
 * harfine alınır; baştaki marka adı atılır.
 */
final class SourceLineMatcher {

    private static final Locale TR = Locale.forLanguageTag("tr");

    private final List<String> lines;

    SourceLineMatcher(String sourceText) {
        this.lines = Arrays.stream(sourceText.split("\\R"))
                .map(String::strip)
                .filter(line -> !line.isEmpty())
                .toList();
    }

    /**
     * AI'nın adındaki kelimelerin hepsini içeren en kısa satırı döner (en kısası: fazladan
     * kelimesi en az olan, yani en yakın eşleşme). Eşleşen satır yoksa boş döner.
     */
    Optional<String> match(String aiName, String brand) {
        Set<String> nameWords = words(aiName);
        if (nameWords.isEmpty()) return Optional.empty();

        return lines.stream()
                .filter(line -> words(line).containsAll(nameWords))
                .min((a, b) -> Integer.compare(words(a).size(), words(b).size()))
                .map(line -> stripBrand(line, brand));
    }

    private static Set<String> words(String text) {
        return Arrays.stream(text.toLowerCase(TR).split("[^\\p{L}\\p{N}]+"))
                .filter(word -> !word.isEmpty())
                .collect(Collectors.toCollection(HashSet::new));
    }

    /** "JumboXHomend 1626H ..." gibi boşluksuz yazılmış markayı da yakalar. */
    private static String stripBrand(String line, String brand) {
        if (brand == null || brand.isBlank()) return line;
        String target = brand.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        int matched = 0;
        int i = 0;
        while (i < line.length() && matched < target.length()) {
            char c = Character.toLowerCase(line.charAt(i));
            if (Character.isWhitespace(c)) {
                i++;
            } else if (c == target.charAt(matched)) {
                matched++;
                i++;
            } else {
                return line;
            }
        }
        if (matched < target.length()) return line;
        String rest = line.substring(i).strip();
        return rest.isEmpty() ? line : rest;
    }
}
