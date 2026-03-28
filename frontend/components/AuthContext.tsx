"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const AUTH_STORAGE_KEY = "facticity_auth";
export const MAX_FREE_DEMO_USES = 3;

type AuthState = {
  isLoggedIn: boolean;
  username: string | null;
  demoUses: number;
};

type AuthContextType = {
  isLoggedIn: boolean;
  username: string | null;
  demoUses: number;
  canUseDemo: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  incrementDemoUsage: () => void;
  resetDemoUsage: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  username: null,
  demoUses: 0,
  canUseDemo: true,
  login: () => false,
  logout: () => {},
  incrementDemoUsage: () => {},
  resetDemoUsage: () => {},
});

function loadAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { isLoggedIn: false, username: null, demoUses: 0 };
  }

  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return { isLoggedIn: false, username: null, demoUses: 0 };
    }
    const parsed = JSON.parse(saved);
    return {
      isLoggedIn: parsed.isLoggedIn === true,
      username: parsed.username || null,
      demoUses: typeof parsed.demoUses === "number" ? parsed.demoUses : 0,
    };
  } catch {
    return { isLoggedIn: false, username: null, demoUses: 0 };
  }
}

function saveAuthState(state: AuthState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return loadAuthState().isLoggedIn;
  });
  const [username, setUsername] = useState<string | null>(() => {
    return loadAuthState().username;
  });
  const [demoUses, setDemoUses] = useState<number>(() => {
    return loadAuthState().demoUses;
  });

  useEffect(() => {
    saveAuthState({ isLoggedIn, username, demoUses });
  }, [isLoggedIn, username, demoUses]);

  const canUseDemo = isLoggedIn || demoUses < MAX_FREE_DEMO_USES;

  const login = useCallback((user: string, password: string) => {
    if (!user.trim() || !password.trim()) {
      return false;
    }

    setIsLoggedIn(true);
    setUsername(user.trim());
    setDemoUses(0);
    return true;
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUsername(null);
    setDemoUses(0);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const incrementDemoUsage = useCallback(() => {
    setDemoUses((current) => Math.min(current + 1, MAX_FREE_DEMO_USES));
  }, []);

  const resetDemoUsage = useCallback(() => {
    setDemoUses(0);
  }, []);


  const value = useMemo(
    () => ({
      isLoggedIn,
      username,
      demoUses,
      canUseDemo,
      login,
      logout,
      incrementDemoUsage,
      resetDemoUsage,
    }),
    [isLoggedIn, username, demoUses, canUseDemo, login, logout, incrementDemoUsage, resetDemoUsage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
