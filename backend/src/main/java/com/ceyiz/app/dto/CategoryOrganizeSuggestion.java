package com.ceyiz.app.dto;

import java.util.List;

/** AI'nın ham cevabı: ürünler adlarıyla anılır, kimliklere CategoryOrganizeService çevirir. */
public record CategoryOrganizeSuggestion(List<Group> groups, List<List<String>> duplicates) {

    public record Group(String name, List<String> items) {}
}
