package com.ceyiz.app.dto;

import com.ceyiz.app.entity.PriceType;
import com.ceyiz.app.entity.ProductStatus;
import com.ceyiz.app.entity.ShareRole;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Listenin tamamının tek seferde özeti: yazdırılabilir özet sayfası ve ödeme planı bunu kullanır.
 * Atlanan (SKIPPED) ürünler listede görünür ama toplamlara katılmaz.
 */
public record ListSummaryResponse(
        String listName,
        LocalDate weddingDate,
        Instant generatedAt,
        Totals totals,
        List<CategorySummary> categories,
        List<SetSummary> sets,
        List<MemberSummary> members
) {

    /** remainingTotal: henüz alınmamış (PLANNED) ve fiyatı olan ürünlerin toplamı. */
    public record Totals(
            int productCount,
            int purchasedCount,
            int plannedCount,
            int skippedCount,
            int unpricedPlannedCount,
            BigDecimal purchasedTotal,
            BigDecimal remainingTotal
    ) {}

    public record CategorySummary(
            String name,
            int productCount,
            int purchasedCount,
            BigDecimal total,
            List<ProductSummary> products
    ) {}

    /**
     * price: kullanılan fiyat notu; yoksa en ucuz not (preferred=false); hiç not yoksa null.
     * setName: ürün listeye eklenmiş bir setin parçasıysa o setin adı; fiyat sette durduğu için
     * fiyatsız olması "fiyatsız ürün" sayılmaz.
     */
    public record ProductSummary(
            String name,
            ProductStatus status,
            PriceSummary price,
            int priceEntryCount,
            String setName
    ) {}

    /** total: peşin fiyat ya da taksitlerin toplamı. */
    public record PriceSummary(
            String storeName,
            PriceType priceType,
            BigDecimal total,
            Integer installmentCount,
            BigDecimal installmentAmount,
            boolean preferred
    ) {}

    public record SetSummary(String name, String storeName, BigDecimal setPrice) {}

    public record MemberSummary(String name, ShareRole role) {}
}
