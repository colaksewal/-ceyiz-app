package com.ceyiz.app.service;


import com.ceyiz.app.dto.UpdatePriceEntryRequest;
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
                                       String url,
                                       UUID requesterId){

        var product = productRepository.findById(productId)
                .orElseThrow(()-> new IllegalArgumentException("Ürün bulunamadı"));

        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(()-> new IllegalArgumentException("Kategori bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        PriceEntry priceEntry = new PriceEntry(
                productId,storeName, priceType,cashPrice,
                installmentCount, installmentAmount, paymentPlanNote, photoUrl, LinkUtils.clean(url));

        return priceEntryRepository.save(priceEntry);



    }

    /** Fiyat notunu düzenler (mağaza, ödeme tipi, fiyatlar, plan notu, link). Fotoğraf ve "kullanılan" işareti korunur. */
    public PriceEntry updatePriceEntry(UUID priceEntryId, UpdatePriceEntryRequest request, UUID requesterId) {
        var priceEntry = priceEntryRepository.findById(priceEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Fiyat notu bulunamadı"));
        var product = productRepository.findById(priceEntry.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));
        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        if (request.storeName() == null || request.storeName().isBlank()) {
            throw new IllegalArgumentException("Mağaza adı boş olamaz");
        }
        if (request.priceType() == null) {
            throw new IllegalArgumentException("Ödeme tipi seçilmeli");
        }
        if (isNegative(request.cashPrice()) || isNegative(request.installmentAmount())
                || (request.installmentCount() != null && request.installmentCount() < 0)) {
            throw new IllegalArgumentException("Fiyat negatif olamaz");
        }
        boolean installment = request.priceType() == PriceType.TAKSITLI;
        String note = request.paymentPlanNote() == null || request.paymentPlanNote().isBlank()
                ? null : request.paymentPlanNote().strip();
        priceEntry.update(request.storeName().strip(), request.priceType(), request.cashPrice(),
                installment ? request.installmentCount() : null,
                installment ? request.installmentAmount() : null,
                note, LinkUtils.clean(request.url()));
        return priceEntryRepository.save(priceEntry);
    }

    private static boolean isNegative(java.math.BigDecimal value) {
        return value != null && value.signum() < 0;
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

    public void deletePriceEntry(UUID priceEntryId, UUID requesterId) {
        var priceEntry = priceEntryRepository.findById(priceEntryId)
                .orElseThrow(() -> new IllegalArgumentException("Fiyat notu bulunamadı"));
        var product = productRepository.findById(priceEntry.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Ürün bulunamadı"));
        var category = categoryRepository.findById(product.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Kategori bulunamadı"));

        listAccessService.requireAtLeastEditor(category.getListId(), requesterId);

        priceEntryRepository.delete(priceEntry);
    }



}
