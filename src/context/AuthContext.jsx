import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, AuthStore } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (AuthStore.isLoggedIn() ? AuthStore.user() : null));
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!AuthStore.isLoggedIn()) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await api.get("/api/notifications/unread-count");
      setUnreadCount(Number(data.count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (user) refreshUnread();
    else setUnreadCount(0);
  }, [user, refreshUnread]);

  const login = useCallback(async (payload) => {
    const auth = await api.post("/api/auth/login", payload);
    AuthStore.set(auth);
    setUser(auth.user);
    return auth;
  }, []);

  const register = useCallback(async (payload) => {
    const auth = await api.post("/api/auth/register", payload);
    AuthStore.set(auth);
    setUser(auth.user);
    return auth;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Token may already be expired; clear locally regardless.
    }
    AuthStore.clear();
    setUser(null);
    setUnreadCount(0);
  }, []);

  const updateUser = useCallback((updated) => {
    AuthStore.updateUser(updated);
    setUser(updated);
  }, []);

  const value = {
    user,
    isLoggedIn: Boolean(user) && AuthStore.isLoggedIn(),
    unreadCount,
    refreshUnread,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
