"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  isMetaMaskInstalled,
  connectMetaMask,
  getCurrentChainId,
  switchToExpectedNetwork,
  signVerificationMessage,
  normalizeMetaMaskError,
} from "@/lib/web3/metamask";
import {
  EXPECTED_CHAIN_ID,
  HARDHAT_NETWORK_CONFIG,
} from "@/lib/web3/config";
import {
  Shield,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Link2,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface WalletStatusProps {
  persistedWalletAddress?: string | null;
  onWalletLinked: (address: string) => void;
  onWalletUnlinked: () => void;
}

export function WalletStatus({
  persistedWalletAddress,
  onWalletLinked,
  onWalletUnlinked,
}: WalletStatusProps) {
  const [hasMetaMask, setHasMetaMask] = useState<boolean>(true);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<number | null>(null);

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isAwaitingSignature, setIsAwaitingSignature] = useState<boolean>(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [disconnectNotice, setDisconnectNotice] = useState<boolean>(false);

  // Normalize checksum of persisted address
  const safePersistedAddress = React.useMemo(() => {
    if (!persistedWalletAddress) return null;
    try {
      return ethers.getAddress(persistedWalletAddress);
    } catch {
      return null;
    }
  }, [persistedWalletAddress]);

  // Read initial MetaMask state and register EIP-1193 listeners
  useEffect(() => {
    const installed = isMetaMaskInstalled();
    setHasMetaMask(installed);

    if (!installed || typeof window === "undefined" || !window.ethereum) {
      return;
    }

    const ethereum = window.ethereum;

    // Check accounts already authorized
    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          try {
            setActiveAccount(ethers.getAddress(accounts[0]));
          } catch {
            setActiveAccount(accounts[0]);
          }
        } else {
          setActiveAccount(null);
        }
      })
      .catch(() => {});

    // Check current chain ID
    getCurrentChainId()
      .then((id) => setActiveChainId(id))
      .catch(() => {});

    // EIP-1193 Event Listeners
    const handleAccountsChanged = (accounts: string[]) => {
      setErrorMessage(null);
      if (!accounts || accounts.length === 0) {
        setActiveAccount(null);
      } else {
        try {
          const checksum = ethers.getAddress(accounts[0]);
          setActiveAccount(checksum);
        } catch {
          setActiveAccount(accounts[0]);
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setErrorMessage(null);
      const parsedId = parseInt(chainIdHex, 16);
      setActiveChainId(parsedId);
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (ethereum && typeof ethereum.removeListener === "function") {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const isWrongNetwork =
    activeChainId !== null && activeChainId !== EXPECTED_CHAIN_ID;

  // Active account matches the server-persisted verified address
  const isOwnershipVerified =
    safePersistedAddress !== null &&
    activeAccount !== null &&
    safePersistedAddress.toLowerCase() === activeAccount.toLowerCase();

  // Handle Network Switching
  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    setErrorMessage(null);
    try {
      await switchToExpectedNetwork();
      const newChain = await getCurrentChainId();
      setActiveChainId(newChain);
    } catch (err: any) {
      setErrorMessage(normalizeMetaMaskError(err, "switch"));
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Full Real Connect & Verification Flow
  const handleConnectAndVerify = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setDisconnectNotice(false);

    try {
      if (!isMetaMaskInstalled()) {
        throw new Error(
          "MetaMask is not installed. Please install the MetaMask browser extension to proceed."
        );
      }

      // Step 1: Connect MetaMask & Request Accounts (eth_requestAccounts)
      const walletInfo = await connectMetaMask();
      setActiveAccount(walletInfo.address);
      setActiveChainId(walletInfo.chainId);

      // Step 2: Validate Network (switch to Hardhat Local if needed)
      if (walletInfo.chainId !== EXPECTED_CHAIN_ID) {
        await switchToExpectedNetwork();
        const updatedChain = await getCurrentChainId();
        setActiveChainId(updatedChain);
        if (updatedChain !== EXPECTED_CHAIN_ID) {
          throw new Error(
            `Please switch your MetaMask network to ${HARDHAT_NETWORK_CONFIG.chainName} (Chain ID ${EXPECTED_CHAIN_ID}).`
          );
        }
      }

      // Step 3: Request Server Nonce Challenge
      const challengeRes = await fetch("/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletInfo.address,
          chainId: EXPECTED_CHAIN_ID,
        }),
      });

      const challengeJson = await challengeRes.json();
      if (!challengeRes.ok || !challengeJson.success) {
        throw new Error(challengeJson.error || "Failed to generate wallet verification challenge.");
      }

      const { nonce, message } = challengeJson.data;

      // Step 4: Request Cryptographic Signature in MetaMask (personal_sign)
      setIsConnecting(false);
      setIsAwaitingSignature(true);

      const signature = await signVerificationMessage(walletInfo.signer, message);

      // Step 5: Verify Signature on Backend & Persist
      setIsAwaitingSignature(false);
      setIsConnecting(true);

      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletInfo.address,
          signature,
          nonce,
          message,
        }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || !verifyJson.success) {
        throw new Error(verifyJson.error || "Signature verification failed.");
      }

      // Step 6: Update Parent State
      onWalletLinked(verifyJson.data.walletAddress);
    } catch (err: any) {
      setErrorMessage(normalizeMetaMaskError(err));
    } finally {
      setIsConnecting(false);
      setIsAwaitingSignature(false);
    }
  };

  // Disconnect / Unlink Verified Wallet
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/wallet/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to unlink wallet.");
      }

      onWalletUnlinked();
      setDisconnectNotice(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to disconnect wallet.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatShortAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Web3 Payout Wallet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              MetaMask account integration for direct smart contract settlements
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {!hasMetaMask ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              MetaMask Not Installed
            </span>
          ) : isOwnershipVerified ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected & Verified
            </span>
          ) : activeAccount ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Connected (Unverified)
            </span>
          ) : safePersistedAddress ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Linked: {formatShortAddress(safePersistedAddress)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-750 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              No Wallet Connected
            </span>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Connection Error</p>
            <p className="text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Disconnect Info Alert */}
      {disconnectNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            Wallet unlinked from your account. To completely remove site access permissions from your browser, open MetaMask &rarr; Connected Sites &rarr; Disconnect.
          </div>
        </div>
      )}

      {/* Network Warning Alert */}
      {isWrongNetwork && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold">Wrong Network Detected</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Connected to chain {activeChainId}. Required: {HARDHAT_NETWORK_CONFIG.chainName} (Chain ID {EXPECTED_CHAIN_ID}).
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={handleSwitchNetwork}
            disabled={isSwitchingNetwork}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isSwitchingNetwork ? "animate-spin" : ""}`} />
            {isSwitchingNetwork ? "Switching..." : "Switch to Hardhat Local"}
          </Button>
        </div>
      )}

      {/* Account Details Box */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active MetaMask Account
            </span>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all">
              {activeAccount || "Not connected in browser"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active Network
            </span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {activeChainId === EXPECTED_CHAIN_ID
                ? `${HARDHAT_NETWORK_CONFIG.chainName} · Chain ID ${activeChainId}`
                : activeChainId
                ? `Unsupported Network (Chain ID ${activeChainId})`
                : "No Network Detected"}
            </span>
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Verified Payout Address (Authoritative)
            </span>
            {safePersistedAddress ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-1.5 font-mono text-xs text-brand-600 dark:text-brand-400 font-semibold break-all">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{safePersistedAddress}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                  ✓ Ownership Verified
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                No verified payout wallet on file. Connect MetaMask to link a verified EVM wallet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Changed Warning */}
      {activeAccount && safePersistedAddress && activeAccount.toLowerCase() !== safePersistedAddress.toLowerCase() && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">MetaMask Account Changed</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Active account ({formatShortAddress(activeAccount)}) differs from verified wallet ({formatShortAddress(safePersistedAddress)}). To disburse payouts to this new account, verify ownership via cryptographic signature below.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400">
          {isConnecting ? (
            <span className="flex items-center gap-1.5 text-brand-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Connecting to MetaMask...
            </span>
          ) : isAwaitingSignature ? (
            <span className="flex items-center gap-1.5 text-amber-500 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Awaiting cryptographic signature in MetaMask...
            </span>
          ) : isOwnershipVerified ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready for automated smart contract settlements.
            </span>
          ) : (
            <span>Signature verification proves private key ownership without revealing keys.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {safePersistedAddress && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDisconnecting || isConnecting || isAwaitingSignature}
              onClick={handleDisconnect}
              className="text-red-500 hover:text-red-600"
            >
              <Unlink className="w-3.5 h-3.5 mr-1" />
              {isDisconnecting ? "Unlinking..." : "Disconnect Wallet"}
            </Button>
          )}

          {!hasMetaMask ? (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white transition"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Install MetaMask
            </a>
          ) : !isOwnershipVerified ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isConnecting || isAwaitingSignature}
              onClick={handleConnectAndVerify}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              {isConnecting
                ? "Connecting..."
                : isAwaitingSignature
                ? "Sign in MetaMask..."
                : activeAccount
                ? "Verify Ownership"
                : "Connect Wallet"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Security Guarantee Card */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Shield className="w-3.5 h-3.5 text-brand-500" />
          <span>Zero Knowledge & Cryptographic Guarantee</span>
        </div>
        <p>
          InsurChain never requests, stores, or transmits your private keys or seed phrase. Ownership is mathematically validated via EIP-191 signatures against server-issued single-use challenges.
        </p>
      </div>
    </div>
  );
}
