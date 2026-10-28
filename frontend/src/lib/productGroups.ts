// Mutfak kategorisinin standart alt grupları. Backend'deki KitchenGroups.java ile aynı liste ve
// yazım olmalı; sunucu bu listede olmayan bir grubu reddeder.
export const KITCHEN_GROUPS = [
  "Pişirme",
  "Hazırlık Gereçleri",
  "Sofra & Servis",
  "Çay & Kahve",
  "Beyaz Eşya & Küçük Ev Aletleri",
  "Saklama & Düzen",
  "Mutfak Tekstili",
  "Temizlik",
] as const;

export const GROUP_EMOJI: Record<string, string> = {
  "Pişirme": "🍳",
  "Hazırlık Gereçleri": "🔪",
  "Sofra & Servis": "🍽️",
  "Çay & Kahve": "☕",
  "Beyaz Eşya & Küçük Ev Aletleri": "🔌",
  "Saklama & Düzen": "🫙",
  "Mutfak Tekstili": "🧺",
  "Temizlik": "🧽",
};

export function isKitchenCategory(name: string): boolean {
  return name.trim().toLocaleLowerCase("tr") === "mutfak";
}
