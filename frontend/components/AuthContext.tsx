"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
export const MAX_FREE_DEMO_USES = 3;

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [demoUses, setDemoUses] = useState<number>(0);

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
