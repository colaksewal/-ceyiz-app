package com.ceyiz.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Önerideki bir kategori: ürün adları ve (sadece üst kategoride) alt kategoriler. Öneri içeriği olarak JSON saklanır;
 * admin yayınlarken bu yapının düzenlenmiş halini gönderir.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProposalCategory(String name, List<String> products, List<ProposalCategory> children) {}
