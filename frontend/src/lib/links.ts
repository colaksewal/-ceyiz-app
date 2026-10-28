// Linkin kısa etiketi: "https://www.korkmazstore.com.tr/uzun/yol?x=1" -> "korkmazstore.com.tr".
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
