package com.ceyiz.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * AI'nın önerdiği ürünler. groups: kategorinin admin tanımlı alt kategorileri varsa her ürünün hangi alt kategoriye
 * girdiği (sunucu adları admin'in yazımına çevirir, tanımsız grup adlarını atar); yoksa null. items hepsinin düz listesi.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProductSuggestionResponse(String categoryName, List<String> items, List<Group> groups) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Group(String name, List<String> items) {}
}
