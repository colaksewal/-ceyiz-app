import { useEffect } from "react";
import type { ReactNode } from "react";
import styles from "./Sheet.module.scss";

// Masaüstünde ortada açılan pencere, telefonda alttan kayan sayfa. Esc ya da arka plana
// tıklama ile kapanır; açıkken arkadaki sayfa kaymasın diye body scroll'u kilitlenir.
export default function Sheet({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  // Geniş içerik (form, seçim listeleri) için masaüstünde daha geniş pencere.
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={`${styles.sheet} ${wide ? styles.wide : ""}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
