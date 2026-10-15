import React, { createContext, useContext, useEffect, useState } from "react";

import { api, loadToken, setToken, setUnauthorizedHandler, TOKEN_KEY, User } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { storage } from "@/src/utils/storage";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    (async () => {
      const saved = await loadToken();
      if (saved) {
        try {
          setUser(await api<User>("/auth/me"));
        } catch {
          await logout();
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleAuth = async (res: { access_token: string; user: User }) => {
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setToken(res.access_token);
    queryClient.clear();
    setUser(res.user);
  };

  const login = async (email: string, password: string) =>
    handleAuth(await api("/auth/login", { method: "POST", body: { email, password } }));

  const register = async (data: { name: string; email: string; phone: string; password: string }) =>
    handleAuth(await api("/auth/register", { method: "POST", body: data }));

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
};
