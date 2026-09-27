"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getCustomerDashboard } from "@/lib/api/customer";
import { CustomerDashboardData } from "@/server/services/dashboard.service";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import {
  ShieldCheck,
  PlusCircle,
  FileCheck,
  Coins,
  FileText,
  Clock,
  ArrowRight,
  Shield,
  Eye,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoEmpty, setIsDemoEmpty] = useState<boolean>(false);

  const fetchData = useCallback(async (emptyMode: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCustomerDashboard({ empty: emptyMode });
      setData(result);
    } catch (err: unknown) {
      console.error("Dashboard fetch error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard data from API service"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(isDemoEmpty);
  }, [fetchData, isDemoEmpty]);

  const toggleEmptyMode = () => {
    const nextMode = !isDemoEmpty;
    setIsDemoEmpty(nextMode);
    fetchData(nextMode);
  };

  return (
    <div className="space-y-8 select-none">
      {/* ==================================================== */}
      {/* WELCOME BANNER & QUICK ACTIONS                       */}
      {/* ==================================================== */}
      <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
            <span>Customer Portal Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-dark-900">
            Welcome back, {user?.fullName || "Policyholder"}
          </h1>
          <p className="text-xs sm:text-sm text-dark-500 leading-relaxed">
            Monitor your policy coverage, submit verifiable insurance claims with evidence,
            and track automated smart contract payouts.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link href="/customer/claims/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Submit New Claim
            </Button>
          </Link>

          <Link href="/customer/policies">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Shield className="w-4 h-4" />}
            >
              View My Policies
            </Button>
          </Link>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 4 STAT CARDS                                         */}
      {/* ==================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-5 rounded-2xl border border-border bg-surface space-y-3"
            >
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load dashboard metrics"
          description={error}
          onRetry={() => fetchData(isDemoEmpty)}
        />
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Policies */}
          <StatCard
            title="Active Policies"
            value={data.metrics.activePolicies}
            description="Underwritten & in effect"
            icon={<ShieldCheck className="w-5 h-5" />}
            accentColor="primary"
          />

          {/* Card 2: Open Claims */}
          <StatCard
            title="Open Claims"
            value={data.metrics.openClaims}
            description="Awaiting review or payment"
            icon={<Clock className="w-5 h-5" />}
            accentColor="warning"
          />

          {/* Card 3: Approved Claims */}
          <StatCard
            title="Approved Claims"
            value={data.metrics.approvedClaims}
            description="Approved for settlement"
            icon={<FileCheck className="w-5 h-5" />}
            accentColor="success"
          />

          {/* Card 4: Total Paid */}
          <StatCard
            title="Total Paid"
            value={formatCurrency(data.metrics.totalPaid)}
            description="Disbursed via Smart Contract / Wire"
            icon={<Coins className="w-5 h-5" />}
            accentColor="success"
          />
        </div>
      ) : null}

      {/* ==================================================== */}
      {/* RECENT CLAIMS SECTION                                */}
      {/* ==================================================== */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Recent Claims</CardTitle>
              {data && data.recentClaims.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-100 text-dark-700">
                  {data.recentClaims.length}
                </span>
              )}
            </div>
            <CardDescription className="mt-1">
              Historical submissions, assessment progression, and payout states
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {/* Demo Toggle to test Empty State vs Populated state */}
            <button
              type="button"
              onClick={toggleEmptyMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-dark-600 hover:text-dark-900 hover:bg-dark-50 transition"
              title="Toggle empty state view for evaluation"
            >
              {isDemoEmpty ? (
                <>
                  <ToggleRight className="w-4 h-4 text-primary-600" />
                  <span>Showing Empty State</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-dark-400" />
                  <span>Test Empty State</span>
                </>
              )}
            </button>

            <Link href="/customer/claims">
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View All Claims
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || data.recentClaims.length === 0 ? (
            /* ============================================== */
            /* EMPTY STATE                                    */
            /* ============================================== */
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={<FileText className="w-6 h-6 stroke-[1.5]" />}
                title="No Claims Submitted Yet"
                description="You haven't filed any insurance claims under your active policies. If you have experienced an eligible incident, submit a claim with evidence to initiate review."
                actionText="Submit New Claim"
                actionHref="/customer/claims/new"
                secondaryActionText={isDemoEmpty ? "Switch Back to Sample Data" : undefined}
                onSecondaryAction={isDemoEmpty ? toggleEmptyMode : undefined}
              />
            </div>
          ) : (
            <>
              {/* ============================================== */}
              {/* DESKTOP TABLE VIEW (hidden on mobile)          */}
              {/* ============================================== */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Policy</TableHead>
                      <TableHead>Requested Amount</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentClaims.map((claim) => (
                      <TableRow key={claim.id} className="group">
                        {/* Claim ID */}
                        <TableCell className="font-mono font-bold text-xs text-dark-900">
                          {claim.claimNumber}
                        </TableCell>

                        {/* Policy */}
                        <TableCell>
                          <div>
                            <p className="font-semibold text-xs text-dark-900">
                              {claim.policyType}
                            </p>
                            <span className="font-mono text-[11px] text-dark-400">
                              {claim.policyNumber}
                            </span>
                          </div>
                        </TableCell>

                        {/* Requested Amount */}
                        <TableCell className="font-semibold text-xs text-dark-900">
                          {formatCurrency(claim.requestedAmount)}
                        </TableCell>

                        {/* Submitted Date */}
                        <TableCell className="text-xs text-dark-500">
                          {formatDate(claim.submittedDate)}
                        </TableCell>

                        {/* Status (Strict Color Rule) */}
                        <TableCell>
                          <StatusBadge status={claim.status} size="sm" />
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right">
                          <Link href={`/customer/claims/${claim.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ============================================== */}
              {/* MOBILE CARDS VIEW (md:hidden, zero overflow)   */}
              {/* ============================================== */}
              <div className="md:hidden divide-y divide-border/60 p-4 space-y-3">
                {data.recentClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="pt-3 first:pt-0 pb-2 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-dark-900 block">
                          {claim.claimNumber}
                        </span>
                        <p className="font-semibold text-xs text-dark-800 mt-0.5">
                          {claim.policyType}
                        </p>
                        <p className="font-mono text-[11px] text-dark-400">
                          {claim.policyNumber}
                        </p>
                      </div>

                      <StatusBadge status={claim.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <div>
                        <span className="text-[11px] text-dark-400 block">Requested Amount</span>
                        <span className="font-bold text-dark-900">
                          {formatCurrency(claim.requestedAmount)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-dark-400 block">Submitted</span>
                        <span className="text-dark-600">
                          {formatDate(claim.submittedDate)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Link href={`/customer/claims/${claim.id}`} className="block">
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Claim Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
