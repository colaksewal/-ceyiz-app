import { useEffect } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { getAiJob } from "../api/aiJobs";
import { isJobActive, useAiJobStore, type TrackedAiJob } from "../store/aiJobStore";
import styles from "./AiJobCenter.module.scss";

const POLL_MS = 3000;

// Arka plandaki AI işlerinin durumunu birkaç saniyede bir sunucuya sorar ve işi başlatan ekran
// o an açık değilse köşede bildirim gösterir. Layout'ta durduğu için kullanıcı hangi sayfada
// olursa olsun çalışır.
export default function AiJobCenter() {
  const jobs = useAiJobStore((state) => state.jobs);
  const watchers = useAiJobStore((state) => state.watchers);
  const update = useAiJobStore((state) => state.update);
  const remove = useAiJobStore((state) => state.remove);

  // Sadece aktif işlerin kimlikleri değişince sorgu döngüsü yeniden kurulur.
  const activeSignature = Object.values(jobs)
    .filter(isJobActive)
    .map((job) => job.jobId)
    .join(",");

  useEffect(() => {
    if (!activeSignature) return;
    let cancelled = false;

    async function poll() {
      const active = Object.values(useAiJobStore.getState().jobs).filter(isJobActive);
      await Promise.all(
        active.map(async (job) => {
          try {
            const latest = await getAiJob(job.jobId);
            if (cancelled) return;
            update(job.key, job.jobId, {
              status: latest.status,
              queuePosition: latest.queuePosition,
              result: latest.result,
              error: latest.error,
            });
          } catch (error) {
            // 404: sunucu yeniden başladı (işler bellekte tutuluyor). Diğer hatalar geçici sayılır.
            if (!cancelled && isAxiosError(error) && error.response?.status === 404) {
              update(job.key, job.jobId, {
                status: "FAILED",
                error: "Sunucu yeniden başladığı için istek yarıda kaldı, tekrar dene.",
              });
            }
          }
        })
      );
    }

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [activeSignature, update]);

  const visible = Object.values(jobs).filter((job) => !watchers[job.key]);
  if (visible.length === 0) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {visible.map((job) => (
        <JobToast key={job.key} job={job} onDismiss={() => remove(job.key)} />
      ))}
    </div>
  );
}

function JobToast({ job, onDismiss }: { job: TrackedAiJob; onDismiss: () => void }) {
  if (isJobActive(job)) {
    return (
      <div className={styles.toast}>
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.text}>
          <strong>{job.label}</strong>
          <span>
            {job.queuePosition > 0
              ? `Sırada, önünde ${job.queuePosition} istek var`
              : "Hazırlanıyor, sen gezinmeye devam et"}
          </span>
        </span>
        <Link to={job.returnTo} className={styles.action}>
          Git
        </Link>
      </div>
    );
  }

  const failed = job.status === "FAILED";
  return (
    <div className={`${styles.toast} ${failed ? styles.toastFailed : styles.toastDone}`}>
      <span className={styles.icon} aria-hidden="true">
        {failed ? "⚠️" : job.status === "EMPTY" ? "🤔" : "✨"}
      </span>
      <span className={styles.text}>
        <strong>{job.label}</strong>
        <span>
          {failed ? job.error : job.status === "EMPTY" ? "AI bir şey çıkaramadı" : "Hazır!"}
        </span>
      </span>
      {!failed && (
        <Link to={job.returnTo} className={styles.action}>
          Göster
        </Link>
      )}
      <button type="button" className={styles.dismiss} aria-label="Kapat" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
}
