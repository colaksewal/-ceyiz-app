package com.ceyiz.app.service;

import com.ceyiz.app.dto.ListSummaryResponse.PriceSummary;
import com.ceyiz.app.dto.PaymentPlanResponse;
import com.ceyiz.app.dto.PaymentPlanResponse.PlanMonth;
import com.ceyiz.app.dto.PaymentPlanResponse.PlanPurchase;
import com.ceyiz.app.entity.PriceType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

/**
 * Alınacak ürünleri aylara dağıtan saf hesap (DB'ye, AI'ya dokunmaz). Küçük AI modeli toplama ve
 * taksit hesabında sık hata yaptığı için rakamlar burada kesinleşir.
 *
 * Model: her ay bütçe kadar para birikime eklenir, önce o ay düşen taksitler ödenir, sonra
 * birikimin yettiği ürünler alınır. Peşin ürün birikim fiyatına ulaşınca alınır; taksitli ürün,
 * ilk taksiti birikimden karşılanabiliyor ve sonraki aylarda taksitlerin toplamı aylık bütçeyi
 * aşmıyorsa başlatılır. Sıra: önce taksitliler (uzun sürdükleri için erken başlasınlar), sonra
 * peşinler ucuzdan pahalıya. Bütçe verilmezse düğüne kadar her şeyi alacak kadar önerilir.
 */
public final class PaymentPlanCalculator {

    /** Düğün tarihi yoksa ya da geçmişse plan bu kadar aya göre önerilir. */
    static final int DEFAULT_MONTHS = 12;
    /** Bütçe çok düşükse simülasyon sonsuza gitmesin. */
    static final int MAX_MONTHS = 120;

    public record PlanItem(String category, String name, PriceSummary price) {}

    private PaymentPlanCalculator() {}

    public static PaymentPlanResponse calculate(List<PlanItem> items,
                                                List<String> unpricedItems,
                                                LocalDate weddingDate,
                                                LocalDate today,
                                                BigDecimal monthlyBudget) {
        YearMonth start = YearMonth.from(today);
        YearMonth wedding = weddingDate == null ? null : YearMonth.from(weddingDate);
        int horizon = wedding != null && !wedding.isBefore(start)
                ? (int) ChronoUnit.MONTHS.between(start, wedding) + 1
                : DEFAULT_MONTHS;

        BigDecimal remainingTotal = items.stream()
                .map(item -> item.price().total())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal suggested = roundUpToHundred(
                remainingTotal.divide(BigDecimal.valueOf(horizon), 2, RoundingMode.CEILING));

        boolean budgetProvided = monthlyBudget != null && monthlyBudget.signum() > 0;
        BigDecimal budget = budgetProvided ? monthlyBudget : suggested;

        List<String> unaffordable = new ArrayList<>();
        List<PlanItem> pending = new ArrayList<>();
        for (PlanItem item : sortForPlanning(items)) {
            // Tek taksiti bile aylık bütçeyi aşan ürün hiçbir zaman başlatılamaz.
            if (isInstallment(item.price()) && item.price().installmentAmount().compareTo(budget) > 0) {
                unaffordable.add(item.name());
            } else {
                pending.add(item);
            }
        }

        List<PlanMonth> months = new ArrayList<>();
        BigDecimal[] due = new BigDecimal[MAX_MONTHS + maxInstallmentCount(items) + 1];
        Arrays.fill(due, BigDecimal.ZERO);
        BigDecimal savings = BigDecimal.ZERO;
        YearMonth finishMonth = null;

        if (budget.signum() > 0) {
            for (int m = 0; m < MAX_MONTHS && (!pending.isEmpty() || hasDueFrom(due, m)); m++) {
                BigDecimal ongoing = due[m];
                savings = savings.add(budget).subtract(ongoing);

                List<PlanPurchase> purchases = new ArrayList<>();
                for (Iterator<PlanItem> it = pending.iterator(); it.hasNext(); ) {
                    PlanItem item = it.next();
                    PriceSummary price = item.price();
                    if (isInstallment(price)) {
                        BigDecimal amount = price.installmentAmount();
                        int count = price.installmentCount();
                        if (savings.compareTo(amount) >= 0 && futureInstallmentsFit(due, m, count, amount, budget)) {
                            savings = savings.subtract(amount);
                            for (int j = 1; j < count; j++) {
                                due[m + j] = due[m + j].add(amount);
                            }
                            purchases.add(new PlanPurchase(item.category(), item.name(), amount, price.total(), count));
                            it.remove();
                        }
                    } else if (savings.compareTo(price.total()) >= 0) {
                        savings = savings.subtract(price.total());
                        purchases.add(new PlanPurchase(item.category(), item.name(), price.total(), price.total(), null));
                        it.remove();
                    }
                }

                BigDecimal paid = purchases.stream()
                        .map(PlanPurchase::amount)
                        .reduce(ongoing, BigDecimal::add);
                if (!purchases.isEmpty()) {
                    finishMonth = start.plusMonths(m);
                }
                if (paid.signum() > 0) {
                    months.add(new PlanMonth(start.plusMonths(m).toString(), purchases, ongoing, paid, savings));
                }
            }
        }
        pending.forEach(item -> unaffordable.add(item.name()));

        BigDecimal installmentsAfterWedding = BigDecimal.ZERO;
        if (wedding != null) {
            int firstAfter = Math.max(0, (int) ChronoUnit.MONTHS.between(start, wedding) + 1);
            for (int m = firstAfter; m < due.length; m++) {
                installmentsAfterWedding = installmentsAfterWedding.add(due[m]);
            }
        }

        return new PaymentPlanResponse(
                budget,
                budgetProvided,
                suggested,
                start.toString(),
                wedding == null ? null : wedding.toString(),
                remainingTotal,
                items.size(),
                unpricedItems,
                unaffordable,
                months,
                finishMonth == null ? null : finishMonth.toString(),
                wedding == null || finishMonth == null ? null : !finishMonth.isAfter(wedding),
                installmentsAfterWedding
        );
    }

    static boolean isInstallment(PriceSummary price) {
        return price.priceType() == PriceType.TAKSITLI
                && price.installmentCount() != null && price.installmentCount() > 1
                && price.installmentAmount() != null && price.installmentAmount().signum() > 0;
    }

    private static List<PlanItem> sortForPlanning(List<PlanItem> items) {
        Comparator<PlanItem> installmentsFirst = Comparator.comparing(item -> !isInstallment(item.price()));
        return items.stream()
                .sorted(installmentsFirst.thenComparing(item -> item.price().total()))
                .toList();
    }

    private static boolean futureInstallmentsFit(BigDecimal[] due, int month, int count, BigDecimal amount,
                                                 BigDecimal budget) {
        for (int j = 1; j < count; j++) {
            if (due[month + j].add(amount).compareTo(budget) > 0) {
                return false;
            }
        }
        return true;
    }

    private static boolean hasDueFrom(BigDecimal[] due, int month) {
        for (int m = month; m < due.length; m++) {
            if (due[m].signum() > 0) return true;
        }
        return false;
    }

    private static int maxInstallmentCount(List<PlanItem> items) {
        return items.stream()
                .filter(item -> isInstallment(item.price()))
                .mapToInt(item -> item.price().installmentCount())
                .max()
                .orElse(0);
    }

    private static BigDecimal roundUpToHundred(BigDecimal value) {
        BigDecimal hundred = BigDecimal.valueOf(100);
        return value.divide(hundred, 0, RoundingMode.CEILING).multiply(hundred);
    }
}
