const ACCENT_COLORS = ["#102C57", "#1679AB", "#FFB1B1", "#FFCBCB"];
const ACCENT_EMOJIS = ["🏠", "💍", "🎁", "🛋️", "🍽️", "🛏️", "🧺", "✨"];

// Görsel yok — id'den deterministik bir renk/emoji üretip her liste kartına tutarlı bir
// rozet veriyoruz (aynı liste her zaman aynı renk/emoji ile görünür).
export function pickListAccent(id: string): { color: string; emoji: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return {
    color: ACCENT_COLORS[hash % ACCENT_COLORS.length],
    emoji: ACCENT_EMOJIS[hash % ACCENT_EMOJIS.length],
  };
}
