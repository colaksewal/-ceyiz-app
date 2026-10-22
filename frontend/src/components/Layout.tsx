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
    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

  return (
    <div>
      <header className={`${styles.header} no-print`}>
        <Link to="/lists" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            💍
          </span>
          Çeyiz Planlayıcı
        </Link>
        {/* Masaüstünde başlıkta, telefonda ekranın altında sabit sekme çubuğu. */}
        <nav className={styles.nav}>
          <NavLink to="/lists" end className={navClass}>
            <span className={styles.navIcon} aria-hidden="true">📋</span>
            <span>Listelerim</span>
          </NavLink>
          <NavLink to="/ceyiz-ekibim" className={navClass}>
            <span className={styles.navIcon} aria-hidden="true">👥</span>
            <span>Çeyiz Ekibim</span>
          </NavLink>
          <NavLink to="/setler" className={navClass}>
            <span className={styles.navIcon} aria-hidden="true">🍽</span>
            <span>Setler</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/templates" className={navClass}>
              <span className={styles.navIcon} aria-hidden="true">🧩</span>
              <span>Şablonlar</span>
            </NavLink>
          )}
        </nav>
        {/* Çıkış Yap gibi seyrek kullanılanlar menüde; küçük buton her genişlikte sığar. */}
        <div className={styles.menu} ref={menuRef}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Menü"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
          {menuOpen && (
            <div className={styles.menuPanel} role="menu">
              <button type="button" role="menuitem" className={styles.menuItem} onClick={handleLogout}>
                <span aria-hidden="true">🚪</span> Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={`page ${styles.main}`}>
        <Outlet />
      </main>
      <AiJobCenter />
    </div>
  );
}
