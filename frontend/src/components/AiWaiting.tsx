import { useEffect, useState } from "react";
import styles from "./AiWaiting.module.scss";

// Sunucu ücretsiz ve ekran kartsız: görselli bir öneri ~1 dk sürüyor. Beklerken mesajlar döner
// ve geçen süre sayılır ki kullanıcı uygulama takıldı sanmasın.
const MESSAGES = [
  "Sunucumuz ücretsiz, o yüzden biraz nefes nefese çalışıyor 🐢",
  "Ekran kartımız yok, her şeyi parmak hesabıyla yapıyoruz 🧮",
  "Param olsaydı bu iş 3 saniye sürerdi, söz 💸",
  "Bedava sunucuda oturuyoruz: kira yok ama hız da yok 🏠",
  "Tabakları tek tek sayıyorum... 🍽️",
  "Fiyatları kuruşu kuruşuna okuyorum 🔍",
  "Sen bir çay koy, ben geliyorum ☕",
  "4 çekirdek, tek hayal: çeyizini düzenlemek ✨",
  "Kayınvalide titizliğiyle inceliyorum 👀",
  "Bu bekleyiş çeyizine değecek 💍",
  "Neredeyse bitti... galiba 😅",
];

const ROTATE_SECONDS = 4;

export default function AiWaiting() {
  const [seconds, setSeconds] = useState(0);
  // Her seferinde aynı mesajla başlamasın.
  const [offset] = useState(() => Math.floor(Math.random() * MESSAGES.length));

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const message = MESSAGES[(offset + Math.floor(seconds / ROTATE_SECONDS)) % MESSAGES.length];

  return (
    <div className={styles.waiting} role="status">
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <p key={message} className={styles.message}>
        {message}
      </p>
      <span className={styles.timer}>{seconds} sn</span>
    </div>
  );
}
