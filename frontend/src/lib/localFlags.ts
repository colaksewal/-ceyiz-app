// Kullanıcıya özel küçük tarayıcı işaretleri ("Başlarken" kartı kapatıldı, özet görüldü).
// Kaybolursa sorun değil: en kötü ihtimalle kart yeniden görünür. Gizli sekmede ya da site
// verisi engelliyken localStorage hata atabildiği için her erişim korunuyor.

export function readFlag(name: string, userId: string | null): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(`${name}:${userId}`) === "1";
  } catch {
    return false;
  }
}

export function setFlag(name: string, userId: string | null): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${name}:${userId}`, "1");
  } catch {
    // Kaydedilemezse işaret sadece bu oturumda geçerli olur.
  }
}
