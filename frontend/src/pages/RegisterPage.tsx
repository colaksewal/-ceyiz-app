import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as registerRequest } from "../api/auth";
import AuthBackground from "../components/AuthBackground";
import styles from "./Auth.module.scss";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerRequest({ email, password, name });
      navigate("/login");
    } catch (err) {
      setError("Kayıt başarısız, bu email zaten kullanılıyor olabilir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <AuthBackground />
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          💍
        </span>
        Çeyiz Planlayıcı
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>Kayıt Ol</h1>
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label>Ad Soyad</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>
        <p className={styles.footer}>
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}
