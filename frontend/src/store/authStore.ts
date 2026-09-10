import { create } from "zustand";

interface AuthState {
  token: string | null;
  userId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// JWT'nin payload kısmındaki "sub" (kullanıcı ID'si) ve "isAdmin" claim'lerini okur —
// imzayı doğrulamıyoruz, sadece backend'in zaten doğruladığı token'dan görüntüleme
// amaçlı bilgi okuyoruz.
function decodePayload(token: string): { userId: string | null; isAdmin: boolean } {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { userId: decoded.sub ?? null, isAdmin: decoded.isAdmin === true };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

const initialToken = localStorage.getItem("token");
const initialPayload = initialToken ? decodePayload(initialToken) : { userId: null, isAdmin: false };

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  userId: initialPayload.userId,
  isAdmin: initialPayload.isAdmin,
  isAuthenticated: !!initialToken,

  login: (token: string) => {
    localStorage.setItem("token", token);
    const payload = decodePayload(token);
    set({ token, userId: payload.userId, isAdmin: payload.isAdmin, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, userId: null, isAdmin: false, isAuthenticated: false });
  },
}));
