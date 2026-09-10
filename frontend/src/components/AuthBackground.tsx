import styles from "./AuthBackground.module.scss";

// Çeyizi çağrıştıran soyut çizgi motifler (yüzük, tabak, fincan, kalp) — gerçek görsel
// yok, marka renkleriyle düşük opasiteli SVG şekiller. Dekoratif, ekran okuyucudan gizli.
export default function AuthBackground() {
  return (
    <svg
      className={styles.bg}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <g id="auth-ring">
          <circle r="60" fill="none" strokeWidth="6" />
        </g>
        <g id="auth-plate">
          <circle r="70" fill="none" strokeWidth="4" />
          <circle r="48" fill="none" strokeWidth="3" />
        </g>
        <g id="auth-cup">
          <path
            d="M -40 -20 h 70 a 8 8 0 0 1 8 8 v 22 a 39 39 0 0 1 -39 39 h -8 a 39 39 0 0 1 -39 -39 v -22 a 8 8 0 0 1 8 -8 Z"
            fill="none"
            strokeWidth="5"
          />
          <path d="M 38 -6 a 20 20 0 0 1 0 40" fill="none" strokeWidth="5" />
        </g>
        <g id="auth-heart">
          <path
            d="M0 22 C -30 0 -40 -30 -18 -42 C -4 -50 8 -44 0 -30 C -8 -44 4 -50 18 -42 C 40 -30 30 0 0 22 Z"
            fill="none"
            strokeWidth="5"
          />
        </g>
      </defs>

      <g transform="translate(150 140)" stroke="#1679AB" opacity="0.18">
        <use href="#auth-ring" />
      </g>
      <g transform="translate(1030 160)" stroke="#FFB1B1" opacity="0.22">
        <use href="#auth-plate" />
      </g>
      <g transform="translate(190 650)" stroke="#102C57" opacity="0.14">
        <use href="#auth-cup" />
      </g>
      <g transform="translate(1040 630)" stroke="#1679AB" opacity="0.16">
        <use href="#auth-heart" />
      </g>
      <g transform="translate(960 470) scale(0.55)" stroke="#102C57" opacity="0.1">
        <use href="#auth-ring" />
      </g>
      <g transform="translate(90 380) scale(0.4)" stroke="#FFB1B1" opacity="0.2">
        <use href="#auth-heart" />
      </g>

      <circle cx="330" cy="280" r="4" fill="#FFB1B1" opacity="0.5" />
      <circle cx="880" cy="260" r="3" fill="#1679AB" opacity="0.4" />
      <circle cx="520" cy="660" r="3" fill="#FFB1B1" opacity="0.5" />
      <circle cx="700" cy="110" r="4" fill="#102C57" opacity="0.3" />
      <circle cx="1000" cy="700" r="3" fill="#1679AB" opacity="0.35" />
    </svg>
  );
}
