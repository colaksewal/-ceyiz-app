import { Link, Outlet, useNavigate } from "react-router-dom";
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

  return (
    <div>
      <header className={styles.header}>
        <Link to="/lists" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            💍
          </span>
          Çeyiz Planlayıcı
        </Link>
        {isAdmin && (
          <Link to="/admin/templates" className="btn btn-secondary">
            Şablon Yönetimi
          </Link>
        )}
        <button className="btn btn-secondary" onClick={handleLogout}>
          Çıkış Yap
        </button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
