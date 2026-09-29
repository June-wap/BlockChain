"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";

export interface DemoUserOption {
  email: string;
  name: string;
  role: UserRole;
  label: string;
  description: string;
}

export const DEMO_USERS: DemoUserOption[] = [
  {
    email: "customer@insurance.com",
    name: "Nguyen Van A (Customer)",
    role: UserRole.CUSTOMER,
    label: "Customer Account",
    description: "Policyholder submitting claims and viewing payouts",
  },
  {
    email: "reviewer@insurance.com",
    name: "Tran Thi B (Claim Reviewer)",
    role: UserRole.CLAIM_REVIEWER,
    label: "Claim Reviewer Staff",
    description: "Insurance officer validating claims and evidence",
  },
  {
    email: "finance@insurance.com",
    name: "Le Van C (Finance)",
    role: UserRole.FINANCE,
    label: "Finance Staff",
    description: "Financial controller authorizing payouts",
  },
  {
    email: "admin@insurance.com",
    name: "Pham Hoang D (System Admin)",
    role: UserRole.ADMIN,
    label: "System Admin",
    description: "Global admin managing users, policies and blockchain",
  },
];

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userOrEmail: User | string, tokenOrRole?: string | UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Bootstrap session from HTTP-only cookie via /api/auth/me
  const refreshUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          return;
        }
      }
      setUser(null);
    } catch (e) {
      console.error("Failed to restore session via /api/auth/me:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (userOrEmail: User | string, tokenOrRole?: string | UserRole) => {
    setIsLoading(true);
    try {
      if (typeof userOrEmail === "object" && userOrEmail !== null) {
        setUser(userOrEmail);
        if (typeof tokenOrRole === "string") {
          setToken(tokenOrRole);
        }
        return;
      }

      const email = userOrEmail;
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password: "password123" }),
      });
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
        setToken(json.data.token || null);
      } else {
        throw new Error(json.error || "Authentication failed");
      }
    } catch (e) {
      console.error("Auth login error:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout request error:", e);
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      router.push("/login");
    }
  };

  const switchRole = async (newRole: UserRole) => {
    const demo = DEMO_USERS.find((u) => u.role === newRole);
    if (demo) {
      await login(demo.email, newRole);
      const targetDash = getDefaultDashboardForRole(newRole);
      router.push(targetDash);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
