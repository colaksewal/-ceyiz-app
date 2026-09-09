package com.ceyiz.app.service;


import com.ceyiz.app.entity.PriceEntry;
import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.repository.CategoryRepository;
import com.ceyiz.app.repository.PriceEntryRepository;
import com.ceyiz.app.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PriceEntryService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ListAccessService listAccessService;
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

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        PriceEntry priceEntry = new PriceEntry(
                productId,storeName, priceType,cashPrice,
                installmentCount, installmentAmount, paymentPlanNote, photoUrl);

        return priceEntryRepository.save(priceEntry);



    }

    @Transactional
    public PriceEntry markAsPreferred(UUID priceEntryId, UUID requesterId){

        var priceEntry = priceEntryRepository.findById(priceEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Fiyat notu bulunamadı"));

        var product = productRepository.findById(priceEntry.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        // Eski tercih edilen kaydı hemen (saveAndFlush ile) veritabanına yazıyoruz ki
        // aşağıdaki markAsPreferred() flush edildiğinde iki kayıt aynı anda "true" olup
        // uq_price_entries_one_preferred_per_product kısıtını ihlal etmesin.
        priceEntryRepository.findByProductIdAndIsPreferredTrue(priceEntry.getProductId())
                .ifPresent(existing -> {
                    existing.unmarkAsPreferred();
                    priceEntryRepository.saveAndFlush(existing);
                });

        priceEntry.markAsPreferred();
        return priceEntryRepository.save(priceEntry);

    }

    public List<PriceEntry> getPriceEntriesForProduct(UUID productId, UUID requesterId) {
        var product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));

        listAccessService.requireAtLeastViewer(category.getListId(), requesterId);

        return priceEntryRepository.findByProductId(productId);
    }



}
