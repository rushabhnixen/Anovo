"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCurrentUser, UserResponse } from "./api";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((newToken: string) => {
    localStorage.setItem("anovo_token", newToken);
    setToken(newToken);
    getCurrentUser(newToken).then(setUser).catch(() => setUser(null));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("anovo_token");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("anovo_token");
    if (stored) {
      setToken(stored);
      getCurrentUser(stored)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("anovo_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
