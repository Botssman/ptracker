"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { signIn, signOut } from "next-auth/react";

export type UserRole = "ADMIN" | "MODERATOR" | "USER";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (inviteCode: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; role?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
        });
        const session = await res.json();

        if (session?.user) {
          setUser({
            id: (session.user as { id?: string }).id || "",
            email: session.user.email || "",
            name: session.user.name || "",
            role: ((session.user as { role?: string }).role || "USER") as UserRole,
          });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("Неверный email или пароль");
    }

    // Fetch session after login
    const sessionRes = await fetch("/api/auth/session", {
      credentials: "include",
    });
    const session = await sessionRes.json();

    if (session?.user) {
      setUser({
        id: (session.user as { id?: string }).id || "",
        email: session.user.email || "",
        name: session.user.name || "",
        role: ((session.user as { role?: string }).role || "USER") as UserRole,
      });
    }
  }, []);

  const register = useCallback(async (inviteCode: string, name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode, name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error((data as { error?: string }).error || "Ошибка регистрации");
    }

    // Auto-login after registration
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    setUser(null);
  }, []);

  const validateInviteCode = useCallback(async (code: string) => {
    const res = await fetch("/api/auth/invite/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    return data as { valid: boolean; role?: string };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        validateInviteCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
