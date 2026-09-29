export const HARDHAT_LOCAL_CHAIN_ID = 31337;
export const HARDHAT_LOCAL_HEX_CHAIN_ID = "0x7a69";

export interface NetworkConfig {
  chainId: number;
  hexChainId: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls?: string[];
}

export const HARDHAT_NETWORK_CONFIG: NetworkConfig = {
  chainId: HARDHAT_LOCAL_CHAIN_ID,
  hexChainId: HARDHAT_LOCAL_HEX_CHAIN_ID,
  chainName: "Hardhat Local",
  rpcUrls: [
    process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
  ],
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
};

export const EXPECTED_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID || HARDHAT_LOCAL_CHAIN_ID
);

export const EXPECTED_HEX_CHAIN_ID = `0x${EXPECTED_CHAIN_ID.toString(16)}`;

export const DEFAULT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS ||
  process.env.INSURANCE_CONTRACT_ADDRESS ||
  "";
