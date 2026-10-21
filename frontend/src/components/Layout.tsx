import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAiJobStore } from "../store/aiJobStore";
import { useAuthStore } from "../store/authStore";
import AiJobCenter from "./AiJobCenter";
import styles from "./Layout.module.scss";

export default function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const clearAiJobs = useAiJobStore((state) => state.clear);
  const navigate = useNavigate();

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
      <header className={styles.header}>
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
        <button className={`btn btn-secondary ${styles.logout}`} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </header>
      <main className={`page ${styles.main}`}>
        <Outlet />
      </main>
      <AiJobCenter />
    </div>
  );
}
