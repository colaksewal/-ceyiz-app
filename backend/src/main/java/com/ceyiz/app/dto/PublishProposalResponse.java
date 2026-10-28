package com.ceyiz.app.dto;

/** Yayınlama sonucu: ortak şablonlara kaç yeni kategori ve ürün eklendi (zaten olanlar tekrar eklenmez). */
public record PublishProposalResponse(int addedCategories, int addedProducts) {}
