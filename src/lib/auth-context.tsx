"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";
import { getDefaultDashboardForRole } from "@/lib/permissions";
import { useRouter, usePathname } from "next/navigation";

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
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "insurance_auth_user";
const STORAGE_KEY_TOKEN = "insurance_auth_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from localStorage and cookies on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
        setCookie("auth_role", parsedUser.role, 7);
        setCookie("auth_token", storedToken, 7);
      }
    } catch (e) {
      console.error("Failed to restore auth session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, requestedRole?: UserRole) => {
    setIsLoading(true);
    // Find matching demo user or create user object
    const demo = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() ||
        (requestedRole && u.role === requestedRole)
    );

    const targetRole = requestedRole || demo?.role || UserRole.CUSTOMER;
    const targetName = demo?.name || email.split("@")[0] || "User";

    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: email || `${targetRole.toLowerCase()}@insurance.com`,
      fullName: targetName,
      role: targetRole,
      walletAddress: "0x71C...B39a",
      createdAt: new Date().toISOString(),
    };

    const mockJwt = `mock_jwt_token_${newUser.id}_${Date.now()}`;

    setUser(newUser);
    setToken(mockJwt);

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, mockJwt);
    setCookie("auth_role", targetRole, 7);
    setCookie("auth_token", mockJwt, 7);

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    deleteCookie("auth_role");
    deleteCookie("auth_token");
    router.push("/login");
  };

  const switchRole = (newRole: UserRole) => {
    const demo = DEMO_USERS.find((u) => u.role === newRole);
    const updatedUser: User = {
      id: user?.id || `usr_${Date.now()}`,
      email: demo?.email || `${newRole.toLowerCase()}@insurance.com`,
      fullName: demo?.name || `Demo ${newRole}`,
      role: newRole,
      walletAddress: "0x71C...B39a",
      createdAt: user?.createdAt || new Date().toISOString(),
    };

    setUser(updatedUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
    setCookie("auth_role", newRole, 7);

    const targetDash = getDefaultDashboardForRole(newRole);
    router.push(targetDash);
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

// Cookie helpers for Next.js Middleware synchronization
function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}
