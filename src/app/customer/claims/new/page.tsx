"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PolicyDetail, PolicyStatus } from "@/types";
import { fetchCustomerPolicies } from "@/lib/api/policies";
import { createClaim } from "@/lib/api/claims";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  AlertCircle,
  Eye,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface UploadedFileItem {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

function ClaimWizardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPolicyId = searchParams.get("policyId");

  const [policies, setPolicies] = useState<PolicyDetail[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Policy Selection
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(preselectedPolicyId || "");

  // Step 2: Incident Details
  const [incidentDate, setIncidentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [incidentType, setIncidentType] = useState<string>("Emergency Medical Care");
  const [location, setLocation] = useState<string>("");
  const [requestedAmount, setRequestedAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Step 3: Evidence Files
  const [evidenceFiles, setEvidenceFiles] = useState<UploadedFileItem[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // Step 4 & 5: Submission state
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idemp_${Date.now()}_${Math.random()}`);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success State (FE-10)
  const [submittedClaim, setSubmittedClaim] = useState<any | null>(null);

  // Load active policies
  useEffect(() => {
    async function loadPolicies() {
      setIsLoadingPolicies(true);
      try {
        const data = await fetchCustomerPolicies();
        // Filter strictly ACTIVE policies
        const active = data.filter((p) => p.status === PolicyStatus.ACTIVE);
        setPolicies(active);

        // Preselect if query param matched active policy
        if (preselectedPolicyId && active.some((p) => p.id === preselectedPolicyId)) {
          setSelectedPolicyId(preselectedPolicyId);
        } else if (active.length > 0 && !selectedPolicyId) {
          setSelectedPolicyId(active[0].id);
        }
      } catch (err) {
        console.error("Failed to load customer policies:", err);
      } finally {
        setIsLoadingPolicies(false);
      }
    }
    loadPolicies();
  }, [preselectedPolicyId]);

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);

  // Validation helpers
  const validateStep1 = () => {
    return !!selectedPolicy;
  };

  const validateStep2 = (): string | null => {
    if (!incidentDate) return "Incident date is required.";
    const incDate = new Date(incidentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (incDate > today) return "Incident date cannot be in the future.";

    if (selectedPolicy) {
      if (incDate < new Date(selectedPolicy.startDate) || incDate > new Date(selectedPolicy.endDate)) {
        return `Incident date must be within policy active period (${selectedPolicy.startDate} to ${selectedPolicy.endDate}).`;
      }
    }

    if (!location.trim()) return "Incident location is required.";

    const amount = Number(requestedAmount);
    if (isNaN(amount) || amount <= 0) return "Requested amount must be greater than $0.";
    if (selectedPolicy && amount > selectedPolicy.coverageAmount) {
      return `Requested amount ($${amount.toLocaleString()}) exceeds the maximum coverage ($${selectedPolicy.coverageAmount.toLocaleString()}).`;
    }

    if (description.trim().length < 15) {
      return "Description must be at least 15 characters long.";
    }

    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    const newFiles: UploadedFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        setFileError(`File "${file.name}" has invalid format. Only PDF, JPG, PNG, and WEBP are accepted.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        setFileError(`File "${file.name}" exceeds the 10MB maximum size limit.`);
        return;
      }

      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: `/api/evidence/${encodeURIComponent(file.name)}`,
      });
    }

    setEvidenceFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Anti double-click
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        policyId: selectedPolicyId,
        incidentDate,
        incidentType,
        location: location.trim(),
        requestedAmount: Number(requestedAmount),
        description: description.trim(),
        evidenceFiles: evidenceFiles.map((f) => ({
          fileName: f.name,
          fileUrl: f.dataUrl,
          fileSize: f.size,
          mimeType: f.type,
        })),
        idempotencyKey,
      };

      const result = await createClaim(payload);
      setSubmittedClaim(result);
      setCurrentStep(5);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit claim. Your entered data has been preserved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUCCESS STATE (FE-10)
  // -------------------------------------------------------------
  if (currentStep === 5 && submittedClaim) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            Received & Logged
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white pt-2">
            Claim Submitted Successfully
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Your claim has been officially registered in the system. An assigned insurance reviewer will audit your documentation shortly.
          </p>
        </div>

        {/* Confirmation Details Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-left text-xs space-y-3 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500">Claim Number</span>
            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
              {submittedClaim.claimNumber || submittedClaim.id}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500">Policy Number</span>
            <span className="font-mono font-medium text-slate-900 dark:text-white">
              {selectedPolicy?.policyNumber}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500">Claim Status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
              SUBMITTED
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500">Claim Amount</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatCurrency(submittedClaim.requestedAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Submitted Timestamp</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(submittedClaim.createdAt || Date.now()).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href={`/customer/claims/${submittedClaim.id}`} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View Claim Details
            </Button>
          </Link>
          <Link href="/customer/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
          <button
            onClick={() => {
              setSubmittedClaim(null);
              setCurrentStep(1);
              setRequestedAmount("");
              setDescription("");
              setEvidenceFiles([]);
              setIdempotencyKey(`idemp_${Date.now()}_${Math.random()}`);
            }}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline py-2"
          >
            Submit Another Claim
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEPPER HEADER
  // -------------------------------------------------------------
  const steps = [
    { num: 1, label: "Policy" },
    { num: 2, label: "Incident" },
    { num: 3, label: "Evidence" },
    { num: 4, label: "Review" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/customer/claims"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to My Claims
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Submit Insurance Claim
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Follow the 4-step wizard to file an incident report and upload verified evidence
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-medium ${
                      isCurrent
                        ? "text-slate-900 dark:text-white font-bold"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.num ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Submit Error Banner */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 dark:text-red-300">
            <p className="font-bold">Submission Failed</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: POLICY SELECTION                                   */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Step 1: Choose an Active Insurance Policy
          </h2>
          <p className="text-xs text-slate-500">
            Claims can only be filed against active policies currently within their coverage window.
          </p>

          {isLoadingPolicies ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            </div>
          ) : policies.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No Active Policies Found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You do not have any active insurance policies eligible for new claim submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((p) => {
                const isSelected = selectedPolicyId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPolicyId(p.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 ring-1 ring-brand-500"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {p.policyNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{p.type}</p>
                      <p className="text-[11px] text-slate-500">
                        Expires on: {formatDate(p.endDate)}
                      </p>
                    </div>

                    <div className="text-right sm:shrink-0">
                      <span className="text-[11px] text-slate-400 block uppercase">Coverage Limit</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.coverageAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              variant="primary"
              disabled={!validateStep1()}
              onClick={() => setCurrentStep(2)}
            >
              Next: Incident Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: INCIDENT DETAILS                                  */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Step 2: Incident Information
            </h2>
            {selectedPolicy && (
              <span className="text-xs text-slate-500">
                Max Coverage: <strong className="text-slate-900 dark:text-white">{formatCurrency(selectedPolicy.coverageAmount)}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Incident Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split("T")[0]}
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Incident Category *
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              >
                <option value="Emergency Medical Care">Emergency Medical Care / Hospitalization</option>
                <option value="Motor Vehicle Collision">Motor Vehicle Collision</option>
                <option value="Property Fire or Water Loss">Property Fire or Water Loss</option>
                <option value="Third-Party Civil Liability">Third-Party Civil Liability</option>
                <option value="Outpatient Consultation">Outpatient Consultation & Drugs</option>
                <option value="Other">Other Verified Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Incident Location / Facility *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Central Hospital, District 1, Ho Chi Minh City"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
              />
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Claim Requested Amount (USD) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                step="1"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
              />
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Detailed Description of Circumstances * (min 15 characters)
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe in detail what happened, date and time, injuries or damages sustained, and medical procedures conducted..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <span className="text-[11px] text-slate-400 block text-right mt-0.5">
              {description.length} / 2000 characters
            </span>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const err = validateStep2();
                if (err) {
                  alert(err);
                } else {
                  setCurrentStep(3);
                }
              }}
            >
              Next: Evidence Documents
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: EVIDENCE UPLOAD                                   */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Step 3: Upload Evidence Documents
          </h2>
          <p className="text-xs text-slate-500">
            Upload hospital discharge summaries, official invoices, police reports, or damage photographs. Raw files are stored securely in backend storage (never placed in raw form on blockchain).
          </p>

          {fileError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {fileError}
            </div>
          )}

          {/* Upload Dropzone */}
          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition">
            <UploadCloud className="w-8 h-8 text-brand-500 mb-2" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Click to select evidence files or drag & drop
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Supported formats: PDF, JPG, PNG, WEBP (Max 10MB per file)
            </span>
            <input
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* File List */}
          {evidenceFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Attached Files ({evidenceFiles.length})
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {evidenceFiles.map((f, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {(f.size / 1024).toFixed(1)} KB • {f.type}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="primary" onClick={() => setCurrentStep(4)}>
              Next: Review & Confirm
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: REVIEW & SUBMIT                                   */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Step 4: Review Claim Details
            </h2>
            <p className="text-xs text-slate-500">
              Please review all entered details before formal submission. You can go back to previous steps to amend any information.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-800 text-xs space-y-3">
            <div className="pb-3 flex justify-between">
              <span className="text-slate-500">Selected Policy</span>
              <span className="font-semibold text-slate-900 dark:text-white text-right">
                {selectedPolicy?.type} ({selectedPolicy?.policyNumber})
              </span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Incident Category</span>
              <span className="font-medium text-slate-900 dark:text-white">{incidentType}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Incident Date</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatDate(incidentDate)}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Incident Location</span>
              <span className="font-medium text-slate-900 dark:text-white">{location}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-slate-500">Claim Requested Amount</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm text-brand-600 dark:text-brand-400">
                {formatCurrency(Number(requestedAmount))}
              </span>
            </div>
            <div className="py-3">
              <span className="text-slate-500 block mb-1">Description</span>
              <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                {description}
              </p>
            </div>
            <div className="pt-3 flex justify-between">
              <span className="text-slate-500">Attached Evidence</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {evidenceFiles.length} file(s) attached
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              By clicking Submit, you certify that all information submitted is true and accurate. Submission generates an immutable audit record.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Button variant="secondary" disabled={isSubmitting} onClick={() => setCurrentStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="shadow-md"
            >
              {isSubmitting ? (
                <span>Submitting Claim to Reviewers...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <span>Submit Claim for Review</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerNewClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-16 text-center text-xs text-slate-400">
          Loading Claim Submission Wizard...
        </div>
      }
    >
      <ClaimWizardInner />
    </Suspense>
  );
}
