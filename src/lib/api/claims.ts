import { BlockchainTransaction, Claim, ClaimReview, EvidenceItem, PolicyDetail } from "@/types";

export interface CreateClaimPayload {
  policyId: string;
  incidentDate: string;
  incidentType: string;
  location: string;
  requestedAmount: number;
  description: string;
  evidenceFiles?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  idempotencyKey?: string;
}

export interface ClaimDetailResponse {
  claim: Claim;
  policy?: PolicyDetail;
  review?: ClaimReview;
  payment?: any;
  blockchainTx?: BlockchainTransaction;
}

export async function fetchClaims(params?: { status?: string; search?: string }): Promise<Claim[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`/api/claims?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load claims");
  }

  const json = await res.json();
  return json.data || [];
}

export async function fetchClaimById(id: string): Promise<ClaimDetailResponse> {
  const res = await fetch(`/api/claims/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Claim error (${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

export async function createClaim(payload: CreateClaimPayload): Promise<Claim> {
  const res = await fetch("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit claim");
  }

  const json = await res.json();
  return json.data;
}

export async function uploadEvidence(file: File, claimId: string): Promise<EvidenceItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("claimId", claimId);

  const res = await fetch("/api/claims/evidence/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed for ${file.name}`);
  }

  const json = await res.json();
  return json.data;
}

export async function approveClaimApi(
  claimId: string,
  approvedAmount: number,
  notes?: string,
  idempotencyKey?: string
) {
  const res = await fetch(`/api/staff/claims/${claimId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approvedAmount, notes, idempotencyKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to approve claim");
  }

  return res.json();
}

export async function rejectClaimApi(claimId: string, reason: string, notes?: string) {
  const res = await fetch(`/api/staff/claims/${claimId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to reject claim");
  }

  return res.json();
}

export async function startReviewClaimApi(claimId: string) {
  const res = await fetch(`/api/staff/claims/${claimId}/start-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start review");
  }

  return res.json();
}
