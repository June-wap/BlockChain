import { User } from "@/types";

export async function fetchProfile(): Promise<User> {
  const res = await fetch("/api/customer/profile", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load profile");
  }

  const json = await res.json();
  return json.data;
}

export async function updateProfileApi(data: {
  fullName?: string;
  phoneNumber?: string;
}): Promise<User> {
  const res = await fetch("/api/customer/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }

  const json = await res.json();
  return json.data;
}
