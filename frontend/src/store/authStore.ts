import { create } from "zustand";

interface AuthState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// JWT'nin payload kısmındaki "sub" claim'i (kullanıcı ID'si) — imzayı doğrulamıyoruz,
// sadece backend'in zaten doğruladığı token'dan görüntüleme amaçlı bilgi okuyoruz.
function decodeUserId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

const initialToken = localStorage.getItem("token");

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  userId: initialToken ? decodeUserId(initialToken) : null,
  isAuthenticated: !!initialToken,

  login: (token: string) => {
    localStorage.setItem("token", token);
    set({ token, userId: decodeUserId(token), isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, userId: null, isAuthenticated: false });
  },
}));
