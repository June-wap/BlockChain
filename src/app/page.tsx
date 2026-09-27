"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { getRoleConfig } from "@/lib/formatters";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Modal,
} from "@/components/ui";
import {
  Shield,
  ShieldCheck,
  FileText,
  FileCheck,
  CheckCircle2,
  Coins,
  Cpu,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  Database,
  KeyRound,
  FileCode,
} from "lucide-react";

export default function HomePage() {
  const { user, isAuthenticated, switchRole, logout } = useAuth();
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);

  const workflowSteps = [
    {
      step: "01",
      title: "Register Policy",
      description:
        "Select your insurance coverage plan, configure deductible limits, and activate policy protection securely.",
      icon: ShieldCheck,
      color: "text-primary-600 bg-primary-50 border-primary-200",
    },
    {
      step: "02",
      title: "Submit Claim",
      description:
        "Provide incident details, requested reimbursement amount, and upload digital evidence (bills, medical reports, photos).",
      icon: FileText,
      color: "text-sky-600 bg-sky-50 border-sky-200",
    },
    {
      step: "03",
      title: "Claim Review",
      description:
        "Insurance staff assess policy conditions, cross-examine evidence validity, and verify cryptographic file digests.",
      icon: FileCheck,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      step: "04",
      title: "Approval",
      description:
        "Reviewer renders a formal decision (Approved or Rejected) with recorded justification and policyholder notification.",
      icon: CheckCircle2,
      color: "text-success-600 bg-success-50 border-success-200",
    },
    {
      step: "05",
      title: "Payment",
      description:
        "Finance executes the disbursement; smart contracts can trigger automated, trustless settlement to the recipient's wallet.",
      icon: Coins,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
  ];

  const transparencyHighlights = [
    {
      title: "Off-Chain Privacy First",
      description:
        "Sensitive customer personal data (PII) and original evidence files are stored securely in off-chain databases—never exposed on the public blockchain.",
      icon: Database,
    },
    {
      title: "Immutable State Tracking",
      description:
        "Critical lifecycle milestones (SUBMITTED, UNDER_REVIEW, APPROVED, PAID) are cryptographically hashed and anchored on the blockchain for permanent auditability.",
      icon: Layers,
    },
    {
      title: "Rule-Based Smart Contracts",
      description:
        "Pre-programmed smart contract logic executes approved disbursements deterministically, preventing arbitrary delays or payment tampering.",
      icon: Cpu,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-dark-900 flex flex-col font-sans">
      {/* ==================================================== */}
      {/* HEADER                                               */}
      {/* ==================================================== */}
      <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-dark-900 block leading-tight">
                InsurChain
              </span>
              <span className="text-[10px] text-primary-600 font-semibold uppercase tracking-wider block">
                Insurance Claim System
              </span>
            </div>
          </Link>

          {/* Navigation & Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/design-system"
              className="hidden md:inline-flex text-xs font-semibold text-dark-600 hover:text-dark-900 px-3 py-1.5 rounded-lg hover:bg-dark-100 transition-colors"
            >
              Design System
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-dark-500 hidden sm:inline">
                  Welcome, <strong className="text-dark-900">{user.fullName}</strong>
                </span>
                <Link href={getRoleConfig(user.role).defaultPath}>
                  <Button size="sm" variant="primary">
                    Go to Portal
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="primary">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* HERO SECTION                                         */}
      {/* ==================================================== */}
      <section className="py-14 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-b border-border bg-gradient-to-b from-surface to-background text-center relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#2563EB_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
            <span>Decentralized Verification &middot; Smart Contract Escrow</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-dark-900 leading-[1.15]">
            Insurance Claim Processing System
          </h1>

          <p className="text-sm sm:text-base text-dark-600 leading-relaxed max-w-2xl mx-auto">
            A trustworthy, transparent platform to manage insurance policies, submit
            claims with verifiable evidence, and execute automated disbursements
            recorded with immutable blockchain transparency.
          </p>

          {/* Hero CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="primary"
                fullWidth
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Register as Customer
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" fullWidth>
                Sign In to Account
              </Button>
            </Link>
          </div>

          {/* Quick Demo Switcher Drawer Trigger */}
          <div className="pt-4">
            <button
              onClick={() => setIsDemoSwitcherOpen(!isDemoSwitcherOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {isDemoSwitcherOpen ? "Hide 1-Click Demo Personas" : "Test with 1-Click Demo Personas (Customer, Reviewer, Finance, Admin)"}
              </span>
            </button>

            {isDemoSwitcherOpen && (
              <div className="mt-4 p-4 rounded-2xl bg-surface border border-border shadow-xs text-left max-w-2xl mx-auto animate-in fade-in duration-150">
                <p className="text-xs font-bold text-dark-800 uppercase tracking-wider mb-2">
                  Select a Demo Persona to Test:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_USERS.map((demo) => {
                    const cfg = getRoleConfig(demo.role);
                    return (
                      <button
                        key={demo.role}
                        onClick={() => switchRole(demo.role)}
                        className="p-3 rounded-xl border border-border hover:border-primary-400 hover:bg-primary-50/40 text-left transition flex items-center justify-between group"
                      >
                        <div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border inline-block mb-1 ${cfg.badgeClass}`}
                          >
                            {demo.role}
                          </span>
                          <p className="text-xs font-semibold text-dark-900 group-hover:text-primary-700">
                            {demo.label}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* HOW IT WORKS                                         */}
      {/* ==================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600">
              End-to-End Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-dark-900 tracking-tight">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-dark-500">
              From initial policy activation to final payout disbursement through 5 verified steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="p-5 rounded-2xl border border-border bg-background hover:bg-surface hover:shadow-xs transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${step.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-dark-400">
                        {step.step}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-dark-900 group-hover:text-primary-700 transition-colors">
                      {step.title}
                    </h3>

                    <p className="text-xs text-dark-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center text-[11px] font-semibold text-primary-600">
                    <span>Verified Step</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* BLOCKCHAIN TRANSPARENCY                              */}
      {/* ==================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5 text-violet-600" />
              <span>Smart Contract Integrity</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-dark-900 tracking-tight">
              Blockchain Transparency &amp; Trust
            </h2>
            <p className="text-xs sm:text-sm text-dark-600 leading-relaxed">
              Our architecture combines the confidentiality of modern enterprise databases
              with the immutable transparency of blockchain smart contracts.
              Critical claim milestones and payment settlements are permanently recorded
              on-chain, giving policyholders and reviewers undeniable proof of action.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {transparencyHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border bg-surface shadow-2xs space-y-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-dark-50 border border-border text-primary-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-dark-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-dark-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* FOOTER                                               */}
      {/* ==================================================== */}
      <footer className="mt-auto bg-surface border-t border-border py-8 px-4 sm:px-6 lg:px-8 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <Shield className="w-4 h-4 text-primary-600 shrink-0" />
            <span className="font-semibold text-dark-800">
              Insurance Claim Processing System
            </span>
            <span>&middot;</span>
            <span>InsurChain &copy; 2026</span>
          </div>

          {/* Links: Privacy, Terms, Design System */}
          <div className="flex items-center gap-6 text-xs font-semibold text-dark-600">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="hover:text-primary-600 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded"
            >
              Terms of Service
            </button>
            <Link
              href="/design-system"
              className="hover:text-primary-600 transition-colors"
            >
              Design System
            </Link>
          </div>
        </div>
      </footer>

      {/* ==================================================== */}
      {/* PRIVACY POLICY MODAL                                 */}
      {/* ==================================================== */}
      <Modal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        title="Privacy & Data Protection Policy"
        description="Insurance Claim Processing System Security Standards"
        footer={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsPrivacyOpen(false)}
          >
            I Understand
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-dark-700 leading-relaxed text-left">
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-primary-900 font-semibold">
            Strict Architecture Principle: Zero Personally Identifiable Information (PII) is stored directly on the blockchain.
          </div>

          <h4 className="font-bold text-dark-900 text-sm">1. Customer Data Confidentiality</h4>
          <p>
            All user identification, government KYC documents, contact records, and bank accounts are encrypted and stored in secure, private backend databases complying with standard data privacy regulations.
          </p>

          <h4 className="font-bold text-dark-900 text-sm">2. Evidence Document Security</h4>
          <p>
            When customers upload claim receipts, invoices, or medical certificates, the files are encrypted off-chain. Only a tamper-evident cryptographic hash (e.g. SHA-256) is referenced for smart contract verification.
          </p>

          <h4 className="font-bold text-dark-900 text-sm">3. Role-Based Access Control (RBAC)</h4>
          <p>
            Access to claimant records is strictly restricted to certified Claim Reviewers, Finance officers, and System Administrators under auditable session governance.
          </p>
        </div>
      </Modal>

      {/* ==================================================== */}
      {/* TERMS OF SERVICE MODAL                               */}
      {/* ==================================================== */}
      <Modal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title="Terms of Service & Claim Settlement Rules"
        description="Operating conditions for policyholders, reviewers and smart contract settlements"
        footer={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsTermsOpen(false)}
          >
            Accept Terms
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-dark-700 leading-relaxed text-left">
          <div className="p-3 bg-dark-50 border border-border rounded-xl text-dark-800 font-medium">
            By participating in the Insurance Claim Processing System, policyholders and staff agree to the following settlement rules.
          </div>

          <h4 className="font-bold text-dark-900 text-sm">1. Genuine Evidence Representation</h4>
          <p>
            All evidence files submitted in support of claims must reflect authentic, verifiable events. Submission of forged receipts or fraudulent documents leads to immediate policy cancellation and administrative blacklisting.
          </p>

          <h4 className="font-bold text-dark-900 text-sm">2. Smart Contract Payout Finality</h4>
          <p>
            Once a claim transitions from APPROVED to PAID via smart contract execution or bank wire, the transaction is finalized on the ledger. Smart contract payouts are executed according to predefined mathematical policy rules.
          </p>

          <h4 className="font-bold text-dark-900 text-sm">3. Audit Trail Integrity</h4>
          <p>
            All reviewer notes, determination timestamps, and approval thresholds are preserved in immutable audit logs to protect both the insurer and the policyholder against disputes.
          </p>
        </div>
      </Modal>
    </div>
  );
}
