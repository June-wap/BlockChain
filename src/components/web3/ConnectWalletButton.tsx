"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Link2, RefreshCw } from "lucide-react";

export interface ConnectWalletButtonProps {
  onConnect: () => void;
  isLoading?: boolean;
  isAwaitingSignature?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
}

export function ConnectWalletButton({
  onConnect,
  isLoading = false,
  isAwaitingSignature = false,
  label = "Connect Wallet",
  variant = "primary",
  size = "sm",
}: ConnectWalletButtonProps) {
  const busy = isLoading || isAwaitingSignature;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy}
      onClick={onConnect}
    >
      {busy ? (
        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
      ) : (
        <Link2 className="w-3.5 h-3.5 mr-1.5" />
      )}
      {isAwaitingSignature
        ? "Sign in MetaMask..."
        : isLoading
        ? "Connecting..."
        : label}
    </Button>
  );
}
