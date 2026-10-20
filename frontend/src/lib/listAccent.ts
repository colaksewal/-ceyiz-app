const ACCENT_COLORS = ["#102C57", "#1679AB", "#FFB1B1", "#FFCBCB"];
const ACCENT_EMOJIS = ["🏠", "💍", "🎁", "🛋️", "🍽️", "🛏️", "🧺", "✨"];

// Görsel yok — id'den deterministik bir renk/emoji üretip her liste kartına tutarlı bir
// rozet veriyoruz (aynı liste her zaman aynı renk/emoji ile görünür).
export function pickListAccent(id: string): { color: string; emoji: string } {
  const hash = hashId(id);
  return {
    color: ACCENT_COLORS[hash % ACCENT_COLORS.length],
    emoji: ACCENT_EMOJIS[hash % ACCENT_EMOJIS.length],
  };
}

const CATEGORY_KEYWORD_EMOJIS: [string, string][] = [
  ["mutfak", "🍳"],
  ["yatak", "🛏️"],
  ["banyo", "🛁"],
  ["salon", "🛋️"],
  ["oturma", "🛋️"],
  ["elektronik", "📺"],
  ["beyaz eşya", "🧊"],
  ["tekstil", "🧺"],
  ["nevresim", "🧺"],
  ["sofra", "🍽️"],
  ["yemek", "🍽️"],
  ["temizlik", "🧽"],
  ["dekor", "🖼️"],
  ["bebek", "🍼"],
  ["gelin", "👰"],
  ["takı", "💍"],
  ["çocuk", "🧸"],
  ["antre", "🚪"],
  ["giriş", "🚪"],
  ["balkon", "🪴"],
  ["bahçe", "🪴"],
  ["çamaşır", "🧺"],
  ["kişisel", "🧴"],
];

// Canlı, doygun renkler — kategori kutularında arka plan tonu ve emoji balonu için.
const TILE_COLORS = ["#FF6B6B", "#FF922B", "#FAB005", "#40C057", "#15AABF", "#4C6EF5", "#9C36B5", "#F06595"];

// Aynı kategori her zaman aynı rengi alsın diye id'den deterministik seçilir.
export function pickTileColor(id: string): string {
  return TILE_COLORS[hashId(id) % TILE_COLORS.length];
}

// Kategori adında bilinen bir anahtar kelime varsa ona uygun emoji, yoksa id'den
// deterministik bir tane — liste kartlarındaki rozetle aynı mantık.
export function pickCategoryEmoji(id: string, name: string): string {
  const lower = name.toLocaleLowerCase("tr");
  const match = CATEGORY_KEYWORD_EMOJIS.find(([keyword]) => lower.includes(keyword));
  return match ? match[1] : ACCENT_EMOJIS[hashId(id) % ACCENT_EMOJIS.length];
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}
