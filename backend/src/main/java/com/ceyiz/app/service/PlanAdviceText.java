package com.ceyiz.app.service;

import com.ceyiz.app.dto.ListSummaryResponse;
import com.ceyiz.app.dto.ListSummaryResponse.CategorySummary;
import com.ceyiz.app.dto.PaymentPlanResponse;
import com.ceyiz.app.dto.PaymentPlanResponse.PlanMonth;
import com.ceyiz.app.dto.PaymentPlanResponse.PlanPurchase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.stream.Collectors;

/**
 * Özet + planı AI'ya gidecek kısa metne çevirir. CPU'da girdi token'ı başına süre ödediğimiz için
 * ürün ürün değil, kategori toplamları ve ay ay özet gönderilir.
 */
final class PlanAdviceText {

    private static final int MAX_MONTHS_IN_TEXT = 18;

    private PlanAdviceText() {}

    static String build(ListSummaryResponse summary, PaymentPlanResponse plan) {
        StringBuilder text = new StringBuilder();
        ListSummaryResponse.Totals totals = summary.totals();

        text.append("Düğün ayı: ").append(plan.weddingMonth() == null ? "belirtilmemiş" : plan.weddingMonth()).append('\n');
        text.append("Plan başlangıcı: ").append(plan.startMonth()).append('\n');
        text.append("Ürün sayısı: ").append(totals.productCount())
                .append(" (alınan ").append(totals.purchasedCount())
                .append(", alınacak ").append(totals.plannedCount())
                .append(", vazgeçilen ").append(totals.skippedCount()).append(")\n");
        text.append("Alınanlara harcanan: ").append(tl(totals.purchasedTotal())).append('\n');
        text.append("Alınacakların toplamı: ").append(tl(plan.remainingTotal())).append('\n');
        text.append("Fiyatı girilmemiş alınacak ürün: ").append(plan.unpricedItems().size()).append('\n');
        text.append("Aylık bütçe: ").append(tl(plan.monthlyBudget()))
                .append(plan.budgetProvided() ? " (kullanıcı girdi)" : " (önerilen)").append('\n');
        text.append("Bitiş ayı: ").append(plan.finishMonth() == null ? "-" : plan.finishMonth());
        if (plan.finishesBeforeWedding() != null) {
            text.append(plan.finishesBeforeWedding() ? " (düğünden önce)" : " (DÜĞÜNDEN SONRA)");
        }
        text.append('\n');
        if (plan.installmentsAfterWedding().signum() > 0) {
            text.append("Düğünden sonra sürecek taksitler: ").append(tl(plan.installmentsAfterWedding())).append('\n');
        }
        if (!plan.unaffordableItems().isEmpty()) {
            text.append("Bu bütçeyle alınamayanlar: ").append(String.join(", ", plan.unaffordableItems())).append('\n');
        }

        text.append("\nKategoriler:\n");
        for (CategorySummary category : summary.categories()) {
            text.append("- ").append(category.name()).append(": ").append(category.productCount())
                    .append(" ürün, ").append(category.purchasedCount()).append(" alındı, toplam ")
                    .append(tl(category.total())).append('\n');
        }

        text.append("\nAylık plan:\n");
        plan.months().stream().limit(MAX_MONTHS_IN_TEXT).forEach(month -> text.append(monthLine(month)));
        if (plan.months().size() > MAX_MONTHS_IN_TEXT) {
            text.append("... (").append(plan.months().size() - MAX_MONTHS_IN_TEXT).append(" ay daha)\n");
        }
        return text.toString();
    }

    private static String monthLine(PlanMonth month) {
        String purchases = month.purchases().stream()
                .map(PlanAdviceText::purchaseText)
                .collect(Collectors.joining(", "));
        return "- " + month.month() + ": ödeme " + tl(month.paid())
                + (month.ongoingInstallments().signum() > 0 ? " (süren taksit " + tl(month.ongoingInstallments()) + ")" : "")
                + (purchases.isEmpty() ? "" : "; alınanlar: " + purchases)
                + '\n';
    }

    private static String purchaseText(PlanPurchase purchase) {
        return purchase.installmentCount() == null
                ? purchase.name() + " " + tl(purchase.total())
                : purchase.name() + " " + purchase.installmentCount() + " taksit × " + tl(purchase.amount());
    }

    private static String tl(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).toPlainString() + " TL";
    }
}
