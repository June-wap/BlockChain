import { ethers } from "ethers";
import {
  HARDHAT_NETWORK_CONFIG,
  EXPECTED_CHAIN_ID,
  EXPECTED_HEX_CHAIN_ID,
} from "./config";

export interface ConnectedWalletInfo {
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
  chainId: number;
  isCorrectNetwork: boolean;
}

export class MetaMaskError extends Error {
  code?: number | string;
  constructor(message: string, code?: number | string) {
    super(message);
    this.name = "MetaMaskError";
    this.code = code;
  }
}

/**
 * Human-readable error normalization for MetaMask / EIP-1193 errors.
 * Never outputs [object Object].
 */
export function normalizeMetaMaskError(error: any, context?: "connect" | "sign" | "switch"): string {
  if (!error) return "An unknown wallet error occurred.";

  if (typeof error === "string") return error;

  const code = error.code ?? error.info?.error?.code ?? error.error?.code;

  if (code === 4001 || code === "ACTION_REJECTED") {
    if (context === "sign") {
      return "Signature request was rejected.";
    }
    return "Connection request was rejected.";
  }

  if (code === 4902 || error.message?.includes("Unrecognized chain ID")) {
    return "Network not configured in MetaMask.";
  }

  if (code === -32002) {
    return "A MetaMask request is already pending. Please open your extension.";
  }

  if (error.message) {
    // Sanitize RPC internal messages
    if (error.message.includes("User rejected the request")) {
      return "Request was rejected by the user.";
    }
    if (error.message.includes("ethers-user-denied")) {
      return "Transaction or signature rejected by user.";
    }
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected wallet error occurred.";
  }
}

/**
 * Detects presence of EIP-1193 MetaMask provider in window.
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum && (window.ethereum.isMetaMask || typeof window.ethereum.request === "function"));
}

/**
 * Gets the current raw window.ethereum provider or throws if not installed.
 */
export function getEthereumProvider() {
  if (!isMetaMaskInstalled()) {
    throw new MetaMaskError(
      "MetaMask extension not detected. Please install MetaMask to continue.",
      "NOT_INSTALLED"
    );
  }
  return window.ethereum!;
}

/**
 * Connects to MetaMask, requests accounts via eth_requestAccounts,
 * initializes ethers.BrowserProvider, and returns wallet details.
 */
export async function connectMetaMask(): Promise<ConnectedWalletInfo> {
  const ethereum = getEthereumProvider();

  let provider: ethers.BrowserProvider;
  try {
    provider = new ethers.BrowserProvider(ethereum);
  } catch (err: any) {
    throw new MetaMaskError("Failed to initialize Web3 provider: " + normalizeMetaMaskError(err));
  }

  let accounts: string[];
  try {
    accounts = await provider.send("eth_requestAccounts", []);
  } catch (err: any) {
    throw new MetaMaskError(normalizeMetaMaskError(err, "connect"), err?.code || 4001);
  }

  if (!accounts || accounts.length === 0) {
    throw new MetaMaskError("No accounts found in MetaMask.", "NO_ACCOUNTS");
  }

  const signer = await provider.getSigner();
  const rawAddress = await signer.getAddress();
  const address = ethers.getAddress(rawAddress);

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const isCorrectNetwork = chainId === EXPECTED_CHAIN_ID;

  return {
    provider,
    signer,
    address,
    chainId,
    isCorrectNetwork,
  };
}

/**
 * Obtains the current chain ID from MetaMask.
 */
export async function getCurrentChainId(): Promise<number> {
  const ethereum = getEthereumProvider();
  try {
    const chainIdHex = await ethereum.request({ method: "eth_chainId" });
    return parseInt(chainIdHex, 16);
  } catch (err: any) {
    throw new MetaMaskError("Failed to detect network chain ID: " + normalizeMetaMaskError(err));
  }
}

/**
 * Requests MetaMask to switch to the expected network (Hardhat Local / 31337).
 * If the chain has not been added yet (error 4902), requests wallet_addEthereumChain.
 */
export async function switchToExpectedNetwork(): Promise<void> {
  const ethereum = getEthereumProvider();

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_HEX_CHAIN_ID }],
    });
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to MetaMask yet
    const isUnrecognized =
      switchError.code === 4902 ||
      switchError.message?.includes("Unrecognized chain ID") ||
      switchError.message?.includes("wallet_addEthereumChain");

    if (isUnrecognized) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_NETWORK_CONFIG.hexChainId,
              chainName: HARDHAT_NETWORK_CONFIG.chainName,
              rpcUrls: HARDHAT_NETWORK_CONFIG.rpcUrls,
              nativeCurrency: HARDHAT_NETWORK_CONFIG.nativeCurrency,
            },
          ],
        });
      } catch (addError: any) {
        throw new MetaMaskError(
          "Failed to add Hardhat Local network to MetaMask: " +
            normalizeMetaMaskError(addError, "switch"),
          addError?.code
        );
      }
    } else {
      throw new MetaMaskError(
        normalizeMetaMaskError(switchError, "switch"),
        switchError?.code
      );
    }
  }
}

/**
 * Signs a server-generated verification challenge using the connected MetaMask signer.
 */
export async function signVerificationMessage(
  signer: ethers.Signer,
  message: string
): Promise<string> {
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (err: any) {
    throw new MetaMaskError(normalizeMetaMaskError(err, "sign"), err?.code || 4001);
  }
}
