import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, tokenStore } from "./api";
import { useToast } from "./useToast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const cached = tokenStore.getCachedUser();
  const [user, setUser] = useState(() => (tokenStore.getAccess() ? cached : null));
  const [initializing, setInitializing] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    if (!tokenStore.getAccess()) {
      setInitializing(false);
      return () => {
        active = false;
      };
    }
    api("/auth/me/")
      .then((me) => {
        if (!active) return;
        setUser(me);
        tokenStore.saveUser(me);
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser((current) => {
        if (current) toast.push("Your session expired — please sign in again.", "error");
        return null;
      });
    };
    window.addEventListener("nebula:session-expired", onExpired);
    return () => window.removeEventListener("nebula:session-expired", onExpired);
  }, [toast]);

  const login = useCallback(async (identifier, password) => {
    const data = await api("/auth/login/", {
      method: "POST",
      body: { username: identifier, password },
      auth: false,
    });
    tokenStore.save(data);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api("/auth/register/", {
      method: "POST",
      body: payload,
      auth: false,
    });
    tokenStore.save(data);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const updated = await api("/auth/me/", { method: "PATCH", body: patch });
    setUser(updated);
    tokenStore.saveUser(updated);
    return updated;
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api("/auth/me/");
    setUser(me);
    tokenStore.saveUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, updateProfile, refreshUser }),
    [user, initializing, login, register, logout, updateProfile, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
