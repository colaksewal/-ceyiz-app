package com.ceyiz.app.service;


import com.ceyiz.app.entity.PriceEntry;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.ListRepository;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PriceEntryService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ListRepository listRepository;
    private final PriceEntryRepository priceEntryRepository;

    public PriceEntry createPriceEntry(UUID productId,
                                       String storeName,
                                       PriceType priceType,
                                       BigDecimal cashPrice,
                                       Integer  installmentCount,
                                       BigDecimal installmentAmount,
                                       String paymentPlanNote,
                                       String photoUrl,
                                       UUID requesterId){

        var product = productRepository.findById(productId)
                .orElseThrow(()-> new IllegalArgumentException("Ürün bulunamadı"));

        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(()-> new IllegalArgumentException("Kategori bulunamadı"));

        var list = listRepository.findById(category.getListId())
                .orElseThrow(()-> new IllegalArgumentException("Liste bulunamadı"));

        if(!list.getOwnerId().equals(requesterId)){
            throw new SecurityException("Bu ürüne fiyat notu ekleme yetkiniz yok");
        }

        PriceEntry priceEntry = new PriceEntry(
                productId,storeName, priceType,cashPrice,
                installmentCount, installmentAmount, paymentPlanNote, photoUrl);

        return priceEntryRepository.save(priceEntry);



    }

    public PriceEntry markAsPreferred(UUID priceEntryId, UUID requesterId){

        var priceEntry = priceEntryRepository.findById(priceEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Fiyat notu bulunamadı"));

        var product = productRepository.findById(priceEntry.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        var list = listRepository.findById(category.getListId())
                .orElseThrow(() -> new IllegalArgumentException("Liste bulunamadı"));

        if (!list.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Bu fiyat notunu işaretleme yetkiniz yok");
        }

        priceEntryRepository.findByProductIdAndIsPreferredTrue(priceEntry.getProductId())
                .ifPresent(PriceEntry::unmarkAsPreferred);

        priceEntry.markAsPreferred();
        return priceEntryRepository.save(priceEntry);

    }

    public List<PriceEntry> getPriceEntriesForProduct(UUID productId, UUID requesterId) {
        var product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        var list = listRepository.findById(category.getListId())
                .orElseThrow(() -> new IllegalArgumentException("Liste bulunamadı"));

        if (!list.getOwnerId().equals(requesterId)) {
            throw new SecurityException("Bu ürünün fiyat notlarını görüntüleme yetkiniz yok");
        }

        return priceEntryRepository.findByProductId(productId);
    }



}
