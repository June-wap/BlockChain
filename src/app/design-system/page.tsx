"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  RadioGroup,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  Dialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  Tabs,
  Dropdown,
  Skeleton,
  EmptyState,
  ErrorState,
  Breadcrumb,
  PageHeader,
  StatCard,
  StatusBadge,
  FileUpload,
  Timeline,
  useToast,
} from "@/components/ui";
import { ClaimStatus, PolicyStatus, PaymentStatus, UserRole } from "@/types";
import {
  Shield,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Coins,
  FileCheck,
  CheckCircle2,
  Users,
  AlertTriangle,
  Upload,
  Calendar,
  DollarSign,
  Download,
  Filter,
} from "lucide-react";

export default function DesignSystemPage() {
  const { toast } = useToast();

  // State for interactive components
  const [activeTab, setActiveTab] = useState("buttons");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("smart_contract");
  const [currentPage, setCurrentPage] = useState(1);

  const colors = [
    { name: "Primary", hex: "#2563EB", bg: "bg-primary-600", text: "text-white", desc: "Main brand action color" },
    { name: "Dark", hex: "#0F172A", bg: "bg-dark-900", text: "text-white", desc: "Deep neutral background & typography" },
    { name: "Success", hex: "#16A34A", bg: "bg-success-600", text: "text-white", desc: "Approved & Paid states" },
    { name: "Warning", hex: "#F59E0B", bg: "bg-warning-500", text: "text-white", desc: "Under Review & Payment Pending" },
    { name: "Danger", hex: "#DC2626", bg: "bg-danger-600", text: "text-white", desc: "Rejected & Failed states" },
    { name: "Background", hex: "#F8FAFC", bg: "bg-background", text: "text-dark-900", desc: "Canvas background (Slate 50)" },
    { name: "Surface", hex: "#FFFFFF", bg: "bg-surface", text: "text-dark-900", desc: "Card & Modal surfaces" },
    { name: "Border", hex: "#E2E8F0", bg: "bg-border", text: "text-dark-900", desc: "Dividers & component borders" },
  ];

  const claimStatuses = [
    { status: ClaimStatus.SUBMITTED, requirement: "SUBMITTED → blue" },
    { status: ClaimStatus.UNDER_REVIEW, requirement: "UNDER_REVIEW → orange" },
    { status: ClaimStatus.APPROVED, requirement: "APPROVED → green" },
    { status: ClaimStatus.REJECTED, requirement: "REJECTED → red" },
    { status: ClaimStatus.PAYMENT_PENDING, requirement: "PAYMENT_PENDING → orange" },
    { status: ClaimStatus.PAID, requirement: "PAID → green" },
  ];

  const sampleTimeline = [
    {
      id: "tl-1",
      title: "Claim Submitted with Medical Evidence",
      timestamp: "Sep 25, 2026 - 14:30 UTC",
      actor: "Customer (Nguyen Van A)",
      roleBadge: <StatusBadge status={UserRole.CUSTOMER} size="sm" />,
      description: "Uploaded discharge receipt and doctor report. SHA-256 evidence digest recorded in database.",
      status: "completed" as const,
    },
    {
      id: "tl-2",
      title: "Reviewer Assigned & Under Active Review",
      timestamp: "Sep 26, 2026 - 09:15 UTC",
      actor: "Claim Reviewer (Tran Thi B)",
      roleBadge: <StatusBadge status={UserRole.CLAIM_REVIEWER} size="sm" />,
      description: "Cross-checked policy deductible ($500) and authorized hospital network validity.",
      status: "completed" as const,
    },
    {
      id: "tl-3",
      title: "Claim Approved by Insurance Reviewer",
      timestamp: "Sep 26, 2026 - 16:45 UTC",
      actor: "Claim Reviewer (Tran Thi B)",
      roleBadge: <StatusBadge status={ClaimStatus.APPROVED} size="sm" />,
      description: "Approved for full coverage payout of $1,850. Routed to Finance Controller queue.",
      status: "completed" as const,
    },
    {
      id: "tl-4",
      title: "Payment Pending Smart Contract Settlement",
      timestamp: "Sep 27, 2026 - 10:00 UTC",
      actor: "Finance Staff (Le Van C)",
      roleBadge: <StatusBadge status={ClaimStatus.PAYMENT_PENDING} size="sm" />,
      description: "Prepared escrow disbursement transaction to recipient wallet 0x71C...B39a.",
      status: "current" as const,
    },
    {
      id: "tl-5",
      title: "Automated Smart Contract Disbursement (PAID)",
      actor: "Smart Contract Escrow",
      roleBadge: <StatusBadge status={ClaimStatus.PAID} size="sm" />,
      description: "Funds released on-chain with cryptographic audit trail.",
      txHash: "0x89e2f...7c1a",
      status: "upcoming" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-dark-900 pb-20">
      {/* Top Navbar */}
      <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-dark-900">
                  InsurChain
                </span>
                <span className="text-[10px] text-primary-600 font-semibold block uppercase tracking-wider">
                  Design System Showcase
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-dark-600 hover:text-dark-900"
            >
              Home
            </Link>
            <Link
              href="/customer/dashboard"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Customer Portal
            </Link>
            <Link
              href="/staff/dashboard"
              className="text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              Staff Desk
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Admin Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Page Header */}
        <PageHeader
          title="Insurance Claim Design System"
          description="Enterprise-grade financial & insurance UI components, accessible WCAG contrast standards, strict claim status mappings, and keyboard accessibility."
          badge={
            <Badge variant="primary" dot>
              Prompt 02 Specification
            </Badge>
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Design tokens validated", "Colors match financial specification")}
              >
                Test Toast
              </Button>
              <Link href="/">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Back to System
                </Button>
              </Link>
            </div>
          }
        />

        {/* 1. Color Palette Tokens */}
        <section className="space-y-4">
          <div className="space-y-1 text-left">
            <h2 className="text-lg font-bold text-dark-900">
              1. Color Palette Tokens (Financial & Trustworthy)
            </h2>
            <p className="text-xs text-dark-500">
              Selected palette strictly avoids crypto neon aesthetics, prioritizing professional insurance clarity.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {colors.map((c) => (
              <div
                key={c.name}
                className="p-4 rounded-2xl border border-border bg-surface shadow-2xs space-y-3"
              >
                <div
                  className={`w-full h-14 rounded-xl border border-border/80 flex items-center justify-center font-mono text-xs font-bold ${c.bg} ${c.text}`}
                >
                  {c.hex}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dark-900">{c.name}</h4>
                  <p className="text-[11px] text-dark-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Status UI Mappings */}
        <section className="space-y-4">
          <div className="space-y-1 text-left">
            <h2 className="text-lg font-bold text-dark-900">
              2. Status UI Mappings (Strict Prompt Rules)
            </h2>
            <p className="text-xs text-dark-500">
              Enforcing exact color associations: SUBMITTED (Blue), UNDER_REVIEW (Orange), APPROVED (Green), REJECTED (Red), PAYMENT_PENDING (Orange), PAID (Green).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {claimStatuses.map((item) => (
              <div
                key={item.status}
                className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-xs text-dark-500">
                    {item.requirement}
                  </span>
                  <p className="text-[11px] text-dark-400">ClaimStatus.{item.status}</p>
                </div>
                <StatusBadge status={item.status} size="md" />
              </div>
            ))}
          </div>
        </section>

        {/* 3. Navigation Tabs for Component Categories */}
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "buttons", label: "Buttons & Actions" },
            { id: "forms", label: "Form Controls & Upload" },
            { id: "cards", label: "Cards & Metrics" },
            { id: "feedback", label: "Feedback & Modals" },
            { id: "data", label: "Tables & Pagination" },
            { id: "timeline", label: "Lifecycle Timeline" },
          ]}
        />

        {/* TAB CONTENT: Buttons */}
        {activeTab === "buttons" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
                <CardDescription>
                  Standard interactive buttons with high contrast focus-visible rings and active states.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                  <Button variant="primary" isLoading>
                    Processing
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Button Sizes & Icons</CardTitle>
                <CardDescription>Small (h-8), Medium (h-9.5), Large (h-11) with SVG icon alignment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>
                    Upload Evidence (Small)
                  </Button>
                  <Button size="md" leftIcon={<Shield className="w-4 h-4" />}>
                    Verify Policy (Medium)
                  </Button>
                  <Button
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Authorize Payout (Large)
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Dropdown
                    trigger={
                      <Button variant="outline" size="sm" rightIcon={<Filter className="w-3.5 h-3.5" />}>
                        Filter Options
                      </Button>
                    }
                    items={[
                      { label: "Show Active Policies", onClick: () => toast.info("Filter applied") },
                      { label: "Show Pending Claims", onClick: () => toast.info("Filter applied") },
                      { divider: true },
                      { label: "Reset All Filters", danger: true, onClick: () => toast.warning("Filters reset") },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB CONTENT: Form Controls */}
        {activeTab === "forms" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Card>
              <CardHeader>
                <CardTitle>Input, Select & Textarea</CardTitle>
                <CardDescription>
                  Accessible inputs with ARIA attributes, error messaging, and helper texts.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Claimant Full Name"
                  placeholder="e.g. Nguyen Van A"
                  helperText="Must match government-issued identity document"
                  required
                />

                <Input
                  label="Claim Amount (USD)"
                  type="number"
                  placeholder="1850"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />

                <Input
                  label="Policy Verification Code"
                  defaultValue="INVALID-123"
                  error="Policy code not recognized in active registry"
                  required
                />

                <Select
                  label="Insurance Policy Category"
                  placeholder="Select policy..."
                  options={[
                    { label: "Health Comprehensive ($50,000)", value: "health" },
                    { label: "Motor Vehicle Premium ($25,000)", value: "auto" },
                    { label: "Property & Hazard ($100,000)", value: "property" },
                  ]}
                  required
                />

                <div className="md:col-span-2">
                  <Textarea
                    label="Incident Description & Loss Summary"
                    placeholder="Provide a detailed summary of the incident, location, and expenses incurred..."
                    showCount
                    maxLength={500}
                    defaultValue="Emergency hospitalization following acute illness on Sep 24. Received inpatient care for 2 days at Central Hospital."
                    helperText="Be as specific as possible to accelerate reviewer assessment."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Checkboxes & Radio Options</CardTitle>
                <CardDescription>Single and group selectors with keyboard focus.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-dark-800 block">
                    Consent & Terms
                  </span>
                  <Checkbox
                    label="I confirm all evidence documents are genuine"
                    description="Submission of fraudulent claims is subject to immediate policy cancellation."
                    checked={checkboxChecked}
                    onChange={(e) => setCheckboxChecked(e.target.checked)}
                  />
                  <Checkbox
                    label="Enable instant blockchain smart contract payout"
                    description="Disbursement will be settled directly to your connected Web3 address."
                    defaultChecked
                  />
                  <Checkbox
                    label="Indeterminate State Sample"
                    indeterminate
                  />
                </div>

                <div>
                  <RadioGroup
                    name="payout_method"
                    label="Preferred Payout Channel"
                    value={radioValue}
                    onChange={setRadioValue}
                    options={[
                      {
                        value: "smart_contract",
                        label: "Smart Contract Escrow (USDC / ETH)",
                        description: "Instant disbursement upon approval (0 fees)",
                      },
                      {
                        value: "bank_transfer",
                        label: "Fiat Bank Wire Transfer (VND / USD)",
                        description: "Standard 1-2 business days settlement",
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evidence Document Upload</CardTitle>
                <CardDescription>
                  Drag-and-drop zone with file size enforcement and cryptographic hash preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  label="Attach Medical Bills, Invoices & Incident Evidence"
                  maxSizeMB={10}
                  maxFiles={4}
                  onFilesChange={(files) => {
                    toast.success(
                      `Attached ${files.length} evidence file(s)`,
                      "Cryptographic hash computed"
                    );
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB CONTENT: Cards & Metrics */}
        {activeTab === "cards" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Policies Active"
                value="1,248"
                trend={{ value: "+12.4%", direction: "up", label: "vs last month" }}
                icon={<ShieldCheck className="w-5 h-5" />}
                accentColor="primary"
              />
              <StatCard
                title="Approved Claims Today"
                value="$38,450"
                trend={{ value: "+8.2%", direction: "up", label: "vs yesterday" }}
                icon={<Coins className="w-5 h-5" />}
                accentColor="success"
              />
              <StatCard
                title="Awaiting Review"
                value="14"
                description="Average wait: 3.8 hrs"
                icon={<FileCheck className="w-5 h-5" />}
                accentColor="warning"
              />
              <StatCard
                title="Smart Contract Gas Used"
                value="1.24 ETH"
                trend={{ value: "-4.1%", direction: "down", label: "network avg" }}
                icon={<ShieldAlert className="w-5 h-5" />}
                accentColor="neutral"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Card Architecture Container</CardTitle>
                <CardDescription>
                  Structured card with header, content area, and action footer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-dark-600 leading-relaxed">
                  The design system utilizes rounded-2xl cards with 1px border (#E2E8F0) and background (#FFFFFF) to establish a clean, financial aesthetic without distractions.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-xs text-dark-400">Policy Terms v2.4</span>
                <Button variant="outline" size="sm">
                  View Full Details
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* TAB CONTENT: Feedback & Modals */}
        {activeTab === "feedback" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Card>
              <CardHeader>
                <CardTitle>Toast Notifications</CardTitle>
                <CardDescription>
                  Accessible auto-dismiss alerts with high contrast colored status badges.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      toast.success(
                        "Claim Approved Successfully",
                        "Scheduled for smart contract payout of $1,850."
                      )
                    }
                  >
                    Trigger Success Toast
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      toast.error(
                        "Claim Submission Rejected",
                        "Uploaded invoice date does not match reported incident period."
                      )
                    }
                  >
                    Trigger Error Toast
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.warning(
                        "Policy Renewal Reminder",
                        "Comprehensive Health plan expires in 14 days."
                      )
                    }
                  >
                    Trigger Warning Toast
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      toast.info(
                        "Smart Contract Synchronized",
                        "Block #18,924,102 verified on Ethereum Sepolia."
                      )
                    }
                  >
                    Trigger Info Toast
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modals & Confirmation Dialogs</CardTitle>
                <CardDescription>
                  Accessible focus-trapping modal windows with keyboard Escape listener.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button onClick={() => setIsModalOpen(true)}>Open Standard Modal</Button>
                <Button variant="danger" onClick={() => setIsDialogOpen(true)}>
                  Open Rejection Dialog
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmptyState
                title="No Pending Claims Found"
                description="Your claims queue is up to date. New claim submissions from policyholders will appear here automatically."
                actionText="Create Demo Claim"
                onAction={() => toast.info("Creating demo claim...")}
              />

              <ErrorState
                title="Failed to Sync Blockchain Transactions"
                errorCode="RPC_TIMEOUT_504"
                description="Unable to reach Ethereum RPC endpoint. Retrying with backup Infura/Alchemy node."
                onRetry={() => toast.success("Connected to backup RPC endpoint")}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Skeleton Shimmer Placeholders</CardTitle>
                <CardDescription>Used during async data fetching and initial page hydration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex items-center gap-3 pt-2">
                  <Skeleton variant="circular" className="w-10 h-10" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB CONTENT: Data & Tables */}
        {activeTab === "data" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Card>
              <CardHeader>
                <CardTitle>Financial Claims Table</CardTitle>
                <CardDescription>
                  Responsive data table with status badges and action menus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Policyholder</TableHead>
                      <TableHead>Coverage Plan</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-bold text-xs">
                        CLM-2026-881
                      </TableCell>
                      <TableCell className="font-medium text-dark-900">
                        Nguyen Van A
                      </TableCell>
                      <TableCell className="text-dark-500">
                        Comprehensive Health
                      </TableCell>
                      <TableCell className="font-semibold text-dark-900">
                        $1,850.00
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ClaimStatus.UNDER_REVIEW} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/staff/claims/clm-501/review">
                          <Button variant="outline" size="sm">
                            Assess
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-mono font-bold text-xs">
                        CLM-2026-724
                      </TableCell>
                      <TableCell className="font-medium text-dark-900">
                        Tran Thi Mai
                      </TableCell>
                      <TableCell className="text-dark-500">
                        Motor Vehicle Premium
                      </TableCell>
                      <TableCell className="font-semibold text-dark-900">
                        $4,200.00
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ClaimStatus.PAYMENT_PENDING} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => toast.success("Disbursing $4,200 payout...")}
                        >
                          Disburse
                        </Button>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell className="font-mono font-bold text-xs">
                        CLM-2026-610
                      </TableCell>
                      <TableCell className="font-medium text-dark-900">
                        Le Hoang Nam
                      </TableCell>
                      <TableCell className="text-dark-500">
                        Property & Hazard
                      </TableCell>
                      <TableCell className="font-semibold text-dark-900">
                        $12,500.00
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ClaimStatus.PAID} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Pagination
                  currentPage={currentPage}
                  totalPages={5}
                  totalItems={48}
                  pageSize={10}
                  onPageChange={setCurrentPage}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB CONTENT: Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <Card>
              <CardHeader>
                <CardTitle>End-to-End Claim Lifecycle Timeline</CardTitle>
                <CardDescription>
                  Visual representation of the lifecycle: SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → PAYMENT_PENDING → PAID.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Timeline items={sampleTimeline} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Standard Modal Sample */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Insurance Policy Verification"
        description="Verify policyholder details against master policy contracts"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Policy Verified");
                setIsModalOpen(false);
              }}
            >
              Confirm Verification
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-dark-600">
            The policyholder holds an active Comprehensive Health policy with a remaining annual cap of $48,150. Deductible for inpatient admission is $500.
          </p>
          <div className="p-3 bg-dark-50 rounded-xl border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-dark-500">Policy Number:</span>
              <span className="font-mono font-bold text-dark-800">POL-HLTH-2026-001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-500">Coverage Status:</span>
              <StatusBadge status={PolicyStatus.ACTIVE} size="sm" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog Sample */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Reject Insurance Claim?"
        description="This action will permanently mark the claim as REJECTED and record the reviewer justification in the audit ledger. The policyholder will be notified."
        confirmText="Confirm Rejection"
        variant="danger"
        onConfirm={() => {
          toast.error("Claim Marked as Rejected", "Logged in audit trail");
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
