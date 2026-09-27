"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/formatters";
import {
  Users,
  ShieldAlert,
  FileStack,
  CreditCard,
  Cpu,
  Layers,
  Activity,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const systemStats = [
    { label: "Total Users & Staff", value: "1,248", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Master Policies", value: "3,410", icon: ShieldAlert, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Cumulative Claims", value: "482", icon: FileStack, color: "text-violet-500", bg: "bg-violet-50" },
    { label: "Smart Contract Volume", value: "$420,000", icon: Cpu, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const adminShortcuts = [
    { title: "User & Role Access", href: "/admin/users", desc: "Manage permissions and customer directory", icon: Users },
    { title: "Staff Roster", href: "/admin/staff", desc: "Assign reviewers and finance officers", icon: Users },
    { title: "Policy Catalog", href: "/admin/policies", desc: "Create and update insurance products", icon: ShieldAlert },
    { title: "Claims Oversight", href: "/admin/claims", desc: "Global lifecycle visibility & overrides", icon: FileStack },
    { title: "Blockchain Explorer", href: "/admin/blockchain", desc: "Smart contract state and network node status", icon: Cpu },
    { title: "Immutable Audit Logs", href: "/admin/audit-logs", desc: "Tamper-evident logs of all RBAC events", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="space-y-2 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block">
            System Administration Console
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Administrator: {user?.fullName || "Admin"}
          </h2>
          <p className="text-sm text-slate-300">
            Global governance of RBAC privileges, smart contract deployment parameters, blockchain transaction sync, and audit integrity.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Governance Subsystems</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminShortcuts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className="p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50/50 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-brand-50 text-slate-700 group-hover:text-brand-600 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-brand-700">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
