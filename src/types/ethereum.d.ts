export interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

export interface MetaMaskEthereumProvider {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
  selectedAddress?: string | null;
  chainId?: string;
  networkVersion?: string;
}

declare global {
  interface Window {
    ethereum?: MetaMaskEthereumProvider;
  }
}
