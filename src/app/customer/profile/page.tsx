"use client";

import React, { useEffect, useState } from "react";
import { User } from "@/types";
import { fetchProfile, updateProfileApi } from "@/lib/api/profile";
import { formatDate } from "@/lib/formatters";
import {
  User as UserIcon,
  Mail,
  Phone,
  Wallet,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Link2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchProfile();
        setProfile(data);
        setFullName(data.fullName || "");
        setPhone(data.phoneNumber || "");
        setWalletAddress(data.walletAddress || "");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await updateProfileApi({
        fullName,
        phoneNumber: phone,
        walletAddress,
      });
      setProfile(updated);
      setSuccessMsg("Profile information updated successfully.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulatedWalletConnect = () => {
    // Standard EVM simulation address
    setWalletAddress("0x71C8366453AB548A31D08f237B855D282126B39a");
  };

  const handleWalletDisconnect = () => {
    setWalletAddress("");
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account Profile & Payout Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal contact details and Web3 wallet for automated claim payouts
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2.5 text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-brand-500" />
            Personal Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Permanent Identifier)
              </label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 912 345 678"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account Role (Assigned)
              </label>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                  {profile?.role}
                </span>
                <span className="text-[11px] text-slate-400">
                  Roles are managed by system administrators
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Web3 Payout Wallet Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand-500" />
              Web3 Payout Wallet
            </h2>
            {walletAddress ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Wallet Linked
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">No Wallet Connected</span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Approved claims can be disbursed directly into this Ethereum/EVM wallet address via the InsuranceClaimHub smart contract.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Wallet Address (EVM Compatible)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
              />
              {walletAddress ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleWalletDisconnect}
                  className="text-red-500 hover:text-red-600"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSimulatedWalletConnect}
                >
                  <Link2 className="w-3.5 h-3.5 mr-1" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>

          {/* Security Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Shield className="w-3.5 h-3.5 text-brand-500" />
              <span>Wallet Security Guarantee</span>
            </div>
            <p>
              InsurChain never requests, stores, or transmits your private keys or secret recovery phrases. Only your public account address is stored for payout routing.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving Changes..." : "Save Profile Details"}
          </Button>
        </div>
      </form>
    </div>
  );
}
