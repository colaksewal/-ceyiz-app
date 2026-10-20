import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import styles from "./Layout.module.scss";

export default function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const navigate = useNavigate();

  function handleLogout() {
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
        <nav className={styles.nav}>
          <NavLink to="/lists" end className={navClass}>
            📋 Listelerim
          </NavLink>
          <NavLink to="/ceyiz-ekibim" className={navClass}>
            👥 Çeyiz Ekibim
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/templates" className={navClass}>
              🧩 Şablonlar
            </NavLink>
          )}
        </nav>
        <button className={`btn btn-secondary ${styles.logout}`} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
