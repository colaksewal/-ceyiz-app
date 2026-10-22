import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAiJobStore } from "../store/aiJobStore";
import { useAuthStore } from "../store/authStore";
import AiJobCenter from "./AiJobCenter";
import styles from "./Layout.module.scss";

export default function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const clearAiJobs = useAiJobStore((state) => state.clear);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sayfa değişince menü kapanır.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Menü açıkken dışına tıklamak ya da Esc menüyü kapatır.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function handleLogout() {
    // AI işleri kullanıcıya ait; başka biri aynı tarayıcıda giriş yaparsa görünmesin.
    clearAiJobs();
    logout();
    navigate("/login");
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.menuItem} ${isActive ? styles.menuItemActive : ""}`;

  return (
    <div>
      <header className={`${styles.header} no-print`}>
        <Link to="/lists" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            💍
          </span>
          Çeyiz Planlayıcı
        </Link>
        {/* Tüm sayfalar ve Çıkış Yap tek menüde; küçük buton her genişlikte sığar. */}
        <div className={styles.menu} ref={menuRef}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Menü"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
          {menuOpen && (
            <nav className={styles.menuPanel}>
              <NavLink to="/lists" end className={navClass}>
                <span className={styles.navIcon} aria-hidden="true">📋</span>
                Listelerim
              </NavLink>
              <NavLink to="/ceyiz-ekibim" className={navClass}>
                <span className={styles.navIcon} aria-hidden="true">👥</span>
                Çeyiz Ekibim
              </NavLink>
              <NavLink to="/setler" className={navClass}>
                <span className={styles.navIcon} aria-hidden="true">🍽</span>
                Setler
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink to="/admin/templates" className={navClass}>
                    <span className={styles.navIcon} aria-hidden="true">🧩</span>
                    Şablonlar
                  </NavLink>
                  <NavLink to="/admin/ai-kayitlari" className={navClass}>
                    <span className={styles.navIcon} aria-hidden="true">🤖</span>
                    AI kayıtları
                  </NavLink>
                </>
              )}
              <hr className={styles.menuDivider} />
              <button type="button" className={`${styles.menuItem} ${styles.logout}`} onClick={handleLogout}>
                <span className={styles.navIcon} aria-hidden="true">🚪</span>
                Çıkış Yap
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <AiJobCenter />
    </div>
  );
}
