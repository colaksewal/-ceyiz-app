import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getListSummary, getPaymentPlan, requestPlanAdvice } from "../api/summary";
import AiWaiting from "../components/AiWaiting";
import { setFlag } from "../lib/localFlags";
import { isJobActive, useAiJob, useAiJobStore } from "../store/aiJobStore";
import { useAuthStore } from "../store/authStore";
import { ROLE_LABELS } from "../lib/shareRole";
import type { ListSummary, PaymentPlan, PaymentPlanAdvice, PriceType, ProductStatus } from "../types";
import styles from "./ListSummaryPage.module.scss";

const tlFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

function formatTl(value: number) {
  return tlFormatter.format(value);
}

// "2026-11" -> "Kasım 2026"
function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

const statusLabels: Record<ProductStatus, string> = {
  PLANNED: "Alınacak",
  PURCHASED: "Alındı",
  SKIPPED: "Vazgeçildi",
};

const priceTypeLabels: Record<PriceType, string> = {
  PESIN: "Peşin",
  TAKSITLI: "Taksitli",
  ELDEN_KREDI_KARTI: "Kredi kartı",
};

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}

// Listenin tamamının yazdırılabilir özeti + kodla hesaplanan ödeme planı + AI yorumu.
// "Yazdır / PDF kaydet" tarayıcının yazdırma penceresini açar; butonlar ve menü çıktıda görünmez.
export default function ListSummaryPage() {
  const { listId } = useParams<{ listId: string }>();
  const userId = useAuthStore((state) => state.userId);

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["listSummary", listId],
    queryFn: () => getListSummary(listId!),
    enabled: !!listId,
  });

  // "Başlarken" kartındaki "özetine bak" adımı.
  useEffect(() => {
    setFlag("summary-seen", userId);
  }, [userId]);

  if (!listId) return null;

  return (
    <div className={styles.page}>
      <Link to={`/lists/${listId}`} className="back-link no-print">
        ← Kategoriler
      </Link>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Özet yüklenemedi</p>}

      {summary && (
        <>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>{summary.listName}</h1>
              <p className={styles.subtitle}>
                {summary.weddingDate ? `Düğün: ${formatDate(summary.weddingDate)} · ` : ""}
                Hazırlanma: {formatDate(summary.generatedAt)}
              </p>
            </div>
            <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
              🖨 Yazdır / PDF kaydet
            </button>
          </header>

          <Totals summary={summary} />
          <Categories summary={summary} />
          <SetsAndTeam summary={summary} />
          <PaymentPlanSection listId={listId} />
        </>
      )}
    </div>
  );
}

function Totals({ summary }: { summary: ListSummary }) {
  const { totals } = summary;
  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.statValue}>{totals.productCount}</span>
        <span className={styles.statLabel}>ürün</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>{formatTl(totals.purchasedTotal)}</span>
        <span className={styles.statLabel}>{totals.purchasedCount} ürün alındı</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>{formatTl(totals.remainingTotal)}</span>
        <span className={styles.statLabel}>{totals.plannedCount} ürün alınacak</span>
      </div>
      {totals.unpricedPlannedCount > 0 && (
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <span className={styles.statValue}>{totals.unpricedPlannedCount}</span>
          <span className={styles.statLabel}>ürünün fiyatı yok</span>
        </div>
      )}
    </div>
  );
}

function Categories({ summary }: { summary: ListSummary }) {
  if (summary.categories.length === 0) {
    return <p className="empty-state">Bu listede henüz kategori yok.</p>;
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Kategoriler</h2>
      {summary.categories.map((category) => (
        <div key={category.name} className={styles.category}>
          <div className={styles.categoryHead}>
            <strong>{category.name}</strong>
            <span className="muted">
              {category.purchasedCount}/{category.productCount} alındı · {formatTl(category.total)}
            </span>
          </div>
          {category.products.length === 0 ? (
            <p className={styles.emptyRow}>Ürün yok</p>
          ) : (
            <table className={styles.table}>
              <tbody>
                {category.products.map((product) => (
                  <tr key={product.name} className={product.status === "SKIPPED" ? styles.skipped : ""}>
                    <td>
                      {product.name}
                      {product.price?.storeName && <span className={styles.store}>{product.price.storeName}</span>}
                    </td>
                    <td className={styles.statusCell}>
                      <span className={`${styles.status} ${styles[`status${product.status}`]}`}>
                        {statusLabels[product.status]}
                      </span>
                    </td>
                    <td className={styles.priceCell}>
                      {product.price ? (
                        <>
                          {formatTl(product.price.total)}
                          <span className={styles.store}>
                            {product.price.installmentCount && product.price.installmentAmount
                              ? `${product.price.installmentCount} × ${formatTl(product.price.installmentAmount)}`
                              : priceTypeLabels[product.price.priceType]}
                            {!product.price.preferred && " · en ucuz not"}
                          </span>
                        </>
                      ) : (
                        <span className="muted">fiyat yok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </section>
  );
}

function SetsAndTeam({ summary }: { summary: ListSummary }) {
  return (
    <div className={styles.twoCol}>
      {summary.sets.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Karşılaştırılan setler</h2>
          <ul className={styles.simpleList}>
            {summary.sets.map((set) => (
              <li key={set.name}>
                <span>
                  {set.name}
                  {set.storeName && <span className="muted"> · {set.storeName}</span>}
                </span>
                <strong>{formatTl(set.setPrice)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Çeyiz ekibi</h2>
        <ul className={styles.simpleList}>
          {summary.members.map((member) => (
            <li key={`${member.name}-${member.role}`}>
              <span>{member.name}</span>
              <span className="muted">{ROLE_LABELS[member.role]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PaymentPlanSection({ listId }: { listId: string }) {
  const [budgetInput, setBudgetInput] = useState("");
  const [budget, setBudget] = useState<number | null>(null);

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ["paymentPlan", listId, budget],
    queryFn: () => getPaymentPlan(listId, budget),
  });

  function applyBudget(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(budgetInput);
    setBudget(budgetInput.trim() && value > 0 ? value : null);
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Ödeme planı</h2>
      <p className={`muted ${styles.planIntro}`}>
        Her ay ayırdığın tutar birikir; önce süren taksitler ödenir, birikim yettikçe ürünler alınır.
        Taksitli ürünler, aylık taksitlerin toplamı bütçeyi aşmayacak şekilde başlatılır.
      </p>

      <form onSubmit={applyBudget} className={`${styles.budgetForm} no-print`}>
        <div className="field">
          <label>Aylık ayırabileceğin tutar (TL)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={plan ? `Boş bırakırsan önerilen: ${plan.suggestedMonthlyBudget}` : "ör. 10000"}
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Hesapla
        </button>
      </form>

      {isLoading && <p className="muted">Hesaplanıyor...</p>}
      {error && <p className="error-text">Ödeme planı hesaplanamadı</p>}
      {plan && <PlanDetails plan={plan} />}
      {plan && plan.plannedItemCount > 0 && <PlanAdvice key={budget ?? "auto"} listId={listId} budget={budget} />}
    </section>
  );
}

function PlanDetails({ plan }: { plan: PaymentPlan }) {
  if (plan.plannedItemCount === 0) {
    return (
      <p className="empty-state">
        Planlanacak ürün yok. Alınacak ürünlere fiyat notu girdikçe plan burada oluşur.
        {plan.unpricedItems.length > 0 && ` (${plan.unpricedItems.length} ürünün fiyatı girilmemiş.)`}
      </p>
    );
  }

  return (
    <>
      <div className={styles.planFacts}>
        <div>
          <span className="muted">Aylık bütçe</span>
          <strong>
            {formatTl(plan.monthlyBudget)} {!plan.budgetProvided && <span className={styles.tag}>önerilen</span>}
          </strong>
        </div>
        <div>
          <span className="muted">Alınacakların toplamı</span>
          <strong>{formatTl(plan.remainingTotal)}</strong>
        </div>
        <div>
          <span className="muted">Son alışveriş</span>
          <strong>{plan.finishMonth ? formatMonth(plan.finishMonth) : "-"}</strong>
        </div>
        {plan.weddingMonth && (
          <div>
            <span className="muted">Düğün</span>
            <strong>{formatMonth(plan.weddingMonth)}</strong>
          </div>
        )}
      </div>

      {plan.finishesBeforeWedding === false && (
        <p className={styles.warn}>
          ⚠️ Bu bütçeyle alışveriş düğünden sonraya taşıyor. Önerilen aylık tutar:{" "}
          {formatTl(plan.suggestedMonthlyBudget)}.
        </p>
      )}
      {plan.installmentsAfterWedding > 0 && (
        <p className={styles.note}>
          Düğünden sonra sürecek taksitler: {formatTl(plan.installmentsAfterWedding)}.
        </p>
      )}
      {plan.unaffordableItems.length > 0 && (
        <p className={styles.warn}>
          ⚠️ Bu bütçeyle alınamayanlar: {plan.unaffordableItems.join(", ")}.
        </p>
      )}
      {plan.unpricedItems.length > 0 && (
        <p className={styles.note}>
          Fiyatı girilmediği için plana katılmayanlar: {plan.unpricedItems.join(", ")}.
        </p>
      )}

      <ol className={styles.months}>
        {plan.months.map((month) => (
          <li key={month.month} className={styles.month}>
            <div className={styles.monthHead}>
              <strong>{formatMonth(month.month)}</strong>
              <span>{formatTl(month.paid)}</span>
            </div>
            {month.purchases.length > 0 && (
              <ul className={styles.purchases}>
                {month.purchases.map((purchase) => (
                  <li key={`${purchase.category}-${purchase.name}`}>
                    <span>
                      {purchase.name} <span className="muted">· {purchase.category}</span>
                    </span>
                    <span>
                      {purchase.installmentCount
                        ? `${purchase.installmentCount} × ${formatTl(purchase.amount)}`
                        : formatTl(purchase.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.monthFoot}>
              {month.ongoingInstallments > 0 && <span>Süren taksitler: {formatTl(month.ongoingInstallments)}</span>}
              <span>Kalan birikim: {formatTl(month.savingsAfter)}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className={`muted ${styles.planIntro}`}>
        Listede olmayan aylarda ödeme yok, sadece birikim yapılıyor.
      </p>
    </>
  );
}

// AI yorumu arka planda çalışır (bkz. aiJobStore); sayfadan çıkılırsa bitince bildirim gelir.
// Yorum, o an seçili bütçeyle hesaplanan plana göre yazılır.
function PlanAdvice({ listId, budget }: { listId: string; budget: number | null }) {
  const location = useLocation();
  const jobKey = `plan:${listId}`;
  const job = useAiJob(jobKey);
  const startJob = useAiJobStore((state) => state.start);
  const removeJob = useAiJobStore((state) => state.remove);
  const [advice, setAdvice] = useState<PaymentPlanAdvice | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: () => requestPlanAdvice(listId, budget),
    onSuccess: ({ jobId }) =>
      startJob({ key: jobKey, jobId, label: "Ödeme planı için AI yorumu", returnTo: location.pathname }),
  });

  useEffect(() => {
    if (!job || isJobActive(job)) return;
    if (job.status === "DONE" && job.result) {
      setAdvice(job.result as PaymentPlanAdvice);
    } else {
      setAdviceError(job.error ?? "AI şu an yorum yazamadı, biraz sonra tekrar dene.");
    }
    removeJob(jobKey);
  }, [job, jobKey, removeJob]);

  const thinking = startMutation.isPending || isJobActive(job);

  return (
    <div className={styles.advice}>
      <div className={styles.adviceHead}>
        <strong>✨ AI yorumu</strong>
        {!thinking && (
          <button
            type="button"
            className="btn btn-secondary no-print"
            onClick={() => {
              setAdvice(null);
              setAdviceError(null);
              startMutation.mutate();
            }}
          >
            {advice ? "Yeniden yorumlat" : "AI'dan yorum iste"}
          </button>
        )}
      </div>
      {!advice && !thinking && !adviceError && (
        <p className="muted no-print">
          AI planı okuyup öncelik ve tasarruf önerileri yazar. Rakamlar yukarıdaki hesaptan gelir; AI
          sadece yorum yapar. Yaklaşık 1 dakika sürebilir.
        </p>
      )}
      {thinking && (
        <div className="no-print">
          <AiWaiting startedAt={job?.startedAt} queuePosition={job?.queuePosition} />
        </div>
      )}
      {startMutation.isError && (
        <p className="error-text">{errorMessage(startMutation.error, "Yorum istenemedi, tekrar dene.")}</p>
      )}
      {adviceError && <p className="error-text">{adviceError}</p>}
      {advice && (
        <>
          {advice.summary && <p className={styles.adviceSummary}>{advice.summary}</p>}
          {advice.tips.length > 0 && (
            <ul className={styles.tips}>
              {advice.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          <p className={styles.disclaimer}>Bu yorum yapay zekâ tarafından yazıldı; kararlarını kendin ver.</p>
        </>
      )}
    </div>
  );
}
