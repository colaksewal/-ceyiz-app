package com.ceyiz.app.service;

import java.util.regex.Pattern;

/** Set, parça ve ürün linkleri: sadece http/https kabul edilir (javascript: gibi adresler tıklanabilir link olmasın). */
public final class LinkUtils {

    private static final Pattern HTTP_URL = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);
    private static final int MAX_LENGTH = 2000;

    private LinkUtils() {}

    /** Boşsa null; geçerliyse kırpılmış hali; değilse IllegalArgumentException. */
    public static String clean(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.strip();
        if (trimmed.length() > MAX_LENGTH || !HTTP_URL.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Geçersiz link: http:// ya da https:// ile başlamalı");
        }
        return trimmed;
    }
}
