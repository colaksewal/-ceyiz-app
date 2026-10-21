import { useEffect, useState } from "react";
import styles from "./AiWaiting.module.scss";

// Sunucu ücretsiz ve ekran kartsız: görselli bir öneri ~1 dk sürüyor. Beklerken mesajlar döner
// ve geçen süre sayılır ki kullanıcı uygulama takıldı sanmasın. Neden yavaş olduğunu anlatan
// (param yok, sunucu bedava) mesajlar her seferinde ilk sırada gelir.
const MESSAGES = [
  "Param olsaydı bu iş 3 saniye sürerdi, söz 💸",
  "Sunucumuz ücretsiz, o yüzden biraz nefes nefese çalışıyor 🐢",
  "Bedava sunucuda oturuyoruz: kira yok ama hız da yok 🏠",
  "Ekran kartı alacak param yok, her şeyi parmak hesabıyla yapıyoruz 🧮",
  "Bir gün zengin olunca bu sunucuyu da güçlendireceğim 🤞",
  "Tabakları tek tek sayıyorum... 🍽️",
  "Fiyatları kuruşu kuruşuna okuyorum 🔍",
  "Sen bir çay koy, ben geliyorum ☕",
  "4 çekirdek, tek hayal: çeyizini düzenlemek ✨",
  "Kayınvalide titizliğiyle inceliyorum 👀",
  "Bu bekleyiş çeyizine değecek 💍",
  "Neredeyse bitti... galiba 😅",
];

const ROTATE_SECONDS = 4;

// İş arka planda sürdüğü için süre, ekran yeniden açılsa da işin başladığı andan sayılır.
export default function AiWaiting({
  startedAt,
  queuePosition = 0,
}: {
  startedAt?: number;
  queuePosition?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.floor((now - (startedAt ?? mountedAt)) / 1000));
  const message =
    queuePosition > 0
      ? `Sıradasın, önünde ${queuePosition} istek var ⏳`
      : MESSAGES[Math.floor(seconds / ROTATE_SECONDS) % MESSAGES.length];

  return (
    <div className={styles.waiting} role="status">
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <div className={styles.body}>
        <p key={message} className={styles.message}>
          {message}
        </p>
        <p className={styles.hint}>Başka sayfaya geçebilirsin, hazır olunca haber vereceğim.</p>
      </div>
      <span className={styles.timer}>{seconds} sn</span>
    </div>
  );
}
