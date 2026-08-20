import { useCallback, useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import { AuthContext } from "./authContextValue";
import React from "react";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("careerpilot_token"));
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  const persistSession = useCallback((payload) => {
    localStorage.setItem("careerpilot_token", payload.accessToken);
    setToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const signup = useCallback(
    async (form) => {
      const { data } = await http.post("/auth/signup", form);
      persistSession(data);
    },
    [persistSession]
  );

  const login = useCallback(
    async (form) => {
      const { data } = await http.post("/auth/login", form);
      persistSession(data);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await http.post("/auth/logout");
      }
    } finally {
      localStorage.removeItem("careerpilot_token");
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const updateProfile = useCallback(async (profile) => {
    const { data } = await http.patch("/profile", profile);
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!token) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const { data } = await http.get("/auth/me");

        if (isMounted) {
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem("careerpilot_token");

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isBootstrapping,
      signup,
      login,
      logout,
      updateProfile
    }),
    [user, token, isBootstrapping, signup, login, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
