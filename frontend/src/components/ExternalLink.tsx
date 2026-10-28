import { linkLabel } from "../lib/links";
import styles from "./ExternalLink.module.scss";

// Ürün/set sayfası linki: kısa etiketle (alan adı) gösterilir, uzun adres satırı taşırmaz.
// Sunucu sadece http/https linki kabul eder; yine de başka bir şema gelirse tıklanabilir yapılmaz.
export default function ExternalLink({ url }: { url: string }) {
  if (!/^https?:\/\//i.test(url)) return null;
  return (
    <a className={styles.link} href={url} target="_blank" rel="noopener noreferrer" title={url}>
      <span aria-hidden="true">🔗</span> {linkLabel(url)}
    </a>
  );
}
