import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOnboardingStatus } from "../api/onboarding";
import { readFlag, setFlag } from "../lib/localFlags";
import { useAuthStore } from "../store/authStore";
import styles from "./OnboardingCard.module.scss";

interface Step {
  title: string;
  hint: string;
  done: boolean;
  // Adımın yapılacağı sayfa; yoksa aynı sayfada (ör. liste oluşturma formu).
  to?: string;
}

// Yeni kullanıcı için "Başlarken" kontrol listesi. Adımlar kullanıcının gerçek verisinden
// hesaplanır (GET /onboarding), yaptıkça kendiliğinden işaretlenir. Kapatılınca bu tarayıcıda
// bir daha görünmez.
export default function OnboardingCard() {
  const userId = useAuthStore((state) => state.userId);
  const [dismissed, setDismissed] = useState(() => readFlag("onboarding-dismissed", userId));

  const { data: status } = useQuery({
    queryKey: ["onboarding"],
    queryFn: getOnboardingStatus,
    enabled: !dismissed,
  });

  if (dismissed || !status) return null;

  const listPath = status.firstListId ? `/lists/${status.firstListId}` : undefined;
  const steps: Step[] = [
    {
      title: "Çeyiz listeni oluştur",
      hint: "Aşağıdaki formdan listene bir isim ver, düğün tarihini de yazarsan ödeme planı ona göre hesaplanır.",
      done: status.hasList,
    },
    {
      title: "Odaları (kategorileri) ekle",
      hint: "\"Şablonlardan getir\" ile Mutfak, Yatak Odası gibi hazır listeleri tek dokunuşla ekle.",
      done: status.hasCategory,
      to: listPath,
    },
    {
      title: "Ürünleri ekle",
      hint: "Kategoriye dokun, ürün yaz ya da \"AI ile ürün öner\"e bir fotoğraf ver.",
      done: status.hasProduct,
      to: listPath,
    },
    {
      title: "Mağazada fiyat notu al",
      hint: "Ürüne dokun, mağaza, fiyat ve taksit bilgisini fotoğrafıyla kaydet.",
      done: status.hasPriceEntry,
      to: listPath,
    },
    {
      title: "Çeyiz ekibini davet et",
      hint: "Annen, eşin ya da kardeşin aynı listeyi seninle birlikte düzenlesin.",
      done: status.hasTeamMember,
      to: status.firstListId ? `/lists/${status.firstListId}/ceyiz-ekibi` : undefined,
    },
    {
      title: "Özetine ve ödeme planına bak",
      hint: "Ne aldın, ne kaldı, hangi ay ne ödeyeceksin; yazdırıp PDF olarak da kaydedebilirsin.",
      done: readFlag("summary-seen", userId),
      to: status.firstListId ? `/lists/${status.firstListId}/ozet` : undefined,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;
  const nextIndex = steps.findIndex((step) => !step.done);

  function dismiss() {
    setFlag("onboarding-dismissed", userId);
    setDismissed(true);
  }

  return (
    <section className={styles.card} aria-labelledby="onboarding-title">
      <div className={styles.head}>
        <div>
          <h2 id="onboarding-title" className={styles.title}>
            {allDone ? "Hepsi tamam 🎉" : "👋 Başlarken"}
          </h2>
          <p className={styles.progressText}>
            {allDone ? "Çeyiz planlayıcıyı tüm özellikleriyle kullanıyorsun." : `${doneCount}/${steps.length} adım tamam`}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Başlarken kartını kapat">
          ✕
        </button>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressBar} style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {!allDone && (
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const isNext = index === nextIndex;
            const content = (
              <>
                <span className={`${styles.check} ${step.done ? styles.checkDone : ""}`} aria-hidden="true">
                  {step.done ? "✓" : index + 1}
                </span>
                <span className={styles.stepText}>
                  <strong>{step.title}</strong>
                  {isNext && <span>{step.hint}</span>}
                </span>
                {step.to && !step.done && (
                  <span className={styles.arrow} aria-hidden="true">
                    ›
                  </span>
                )}
              </>
            );
            const className = `${styles.step} ${step.done ? styles.stepDone : ""} ${isNext ? styles.stepNext : ""}`;
            return (
              <li key={step.title}>
                {step.to && !step.done ? (
                  <Link to={step.to} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {allDone && (
        <button type="button" className="btn btn-secondary" onClick={dismiss}>
          Kartı kapat
        </button>
      )}
    </section>
  );
}
