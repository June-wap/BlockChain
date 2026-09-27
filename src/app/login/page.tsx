"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { UserRole } from "@/types";
import { Shield, ArrowRight, Lock, Mail } from "lucide-react";
import { getRoleConfig } from "@/lib/formatters";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email || "customer@insurance.com", selectedRole);
    setIsSubmitting(false);

    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      router.push(getRoleConfig(selectedRole).defaultPath);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole, demoEmail: string) => {
    setIsSubmitting(true);
    await login(demoEmail, role);
    setIsSubmitting(false);

    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      router.push(getRoleConfig(role).defaultPath);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700 py-8 px-6 shadow-xl rounded-2xl sm:px-10 space-y-6">
      {/* Quick Demo Access Buttons */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Quick 1-Click Demo Login
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_USERS.map((demo) => {
            const cfg = getRoleConfig(demo.role);
            return (
              <button
                key={demo.role}
                type="button"
                onClick={() => handleQuickDemoLogin(demo.role, demo.email)}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-slate-700 hover:border-brand-400 text-left transition flex flex-col justify-between group"
              >
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block w-fit mb-1 ${cfg.badgeClass}`}
                >
                  {demo.role}
                </span>
                <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                  {demo.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-800 px-2 text-slate-400 font-medium">
            Or sign in manually
          </span>
        </div>
      </div>

      {/* Manual Form */}
      <form className="space-y-4" onSubmit={handleLogin}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Account Role
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-brand-500"
          >
            <option value={UserRole.CUSTOMER}>Customer</option>
            <option value={UserRole.CLAIM_REVIEWER}>Claim Reviewer</option>
            <option value={UserRole.FINANCE}>Finance Staff</option>
            <option value={UserRole.ADMIN}>System Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@insurance.com"
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
        >
          <span>{isSubmitting ? "Authenticating..." : "Sign In"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-700 text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            InsurChain
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your credentials or choose a quick demo role below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Suspense
          fallback={
            <div className="bg-slate-800 border border-slate-700 py-12 px-6 rounded-2xl text-center text-slate-400 text-xs">
              Loading authentication interface...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
