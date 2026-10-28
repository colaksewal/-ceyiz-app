// Mutfak kategorisinde AI sadece 8 standart gruba (alt kategoriye) çalışır. Backend'deki
// KitchenGroups.isKitchen ile aynı kural: kategori adı tam olarak "Mutfak".
export function isKitchenCategory(name: string): boolean {
  return name.trim().toLocaleLowerCase("tr") === "mutfak";
}
