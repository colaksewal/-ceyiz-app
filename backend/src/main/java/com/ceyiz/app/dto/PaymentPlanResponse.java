package com.ceyiz.app.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kodla hesaplanan ödeme planı (bkz. PaymentPlanCalculator). Aylar "2026-11" biçiminde.
 * Rakamların hepsi burada kesinleşir; AI sadece bunun üzerine yorum yazar.
 */
public record PaymentPlanResponse(
        BigDecimal monthlyBudget,
        boolean budgetProvided,
        BigDecimal suggestedMonthlyBudget,
        String startMonth,
        String weddingMonth,
        BigDecimal remainingTotal,
        int plannedItemCount,
        List<String> unpricedItems,
        List<String> unaffordableItems,
        List<PlanMonth> months,
        String finishMonth,
        Boolean finishesBeforeWedding,
        BigDecimal installmentsAfterWedding
) {

    /** paid: o ay ödenen toplam (peşinler + ilk taksitler + süren taksitler). */
    public record PlanMonth(
            String month,
            List<PlanPurchase> purchases,
            BigDecimal ongoingInstallments,
            BigDecimal paid,
            BigDecimal savingsAfter
    ) {}

    /** amount: bu ay ödenen kısım; taksitliyse ilk taksit, installmentCount kaç ay süreceği. */
    public record PlanPurchase(
            String category,
            String name,
            BigDecimal amount,
            BigDecimal total,
            Integer installmentCount
    ) {}
}
