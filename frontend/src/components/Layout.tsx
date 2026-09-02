import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import styles from "./Layout.module.scss";

export default function Layout() {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div>
      <header className={styles.header}>
        <Link to="/lists" className={styles.brand}>
          Çeyiz Planlayıcı
        </Link>
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
