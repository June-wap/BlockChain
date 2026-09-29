/**
 * Blockchain Currency Conversion Utility
 *
 * Provides deterministic conversion between application USD business amounts
 * and blockchain-native wei.
 *
 * Uses rational integer arithmetic (cents & wei) to eliminate floating-point precision loss.
 *
 * LOCAL DEMO RATE:
 *   DEMO_USD_PER_ETH = 1000
 *   $1,000 USD = 1.0 ETH  = 1,000,000,000,000,000,000 wei (10^18 wei)
 *   $500 USD   = 0.5 ETH  = 500,000,000,000,000,000 wei
 *   $100 USD   = 0.1 ETH  = 100,000,000,000,000,000 wei
 *   $1 USD     = 0.001 ETH= 1,000,000,000,000,000 wei
 *   $1.50 USD  = 0.0015 ETH = 1,500,000,000,000,000 wei
 */

export const WEI_PER_ETH = 10n ** 18n;

/**
 * Resolves configured demo USD/ETH rate with safety validation.
 */
export function getDemoUsdPerEth(): number {
  // Production safety: Require explicit configuration if in production
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BLOCKCHAIN_PAYOUT_CONVERSION_MODE !== "demo-fixed-rate" &&
    process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID !== "31337"
  ) {
    throw new Error(
      "PRODUCTION_SAFETY_VIOLATION: Demo fixed conversion rate (DEMO_USD_PER_ETH) is prohibited in production without explicit BLOCKCHAIN_PAYOUT_CONVERSION_MODE=demo-fixed-rate."
    );
  }

  const rateEnv = process.env.DEMO_USD_PER_ETH || process.env.NEXT_PUBLIC_DEMO_USD_PER_ETH;
  const rate = rateEnv !== undefined && rateEnv.trim() !== "" ? Number(rateEnv) : 1000;

  if (typeof rate !== "number" || !Number.isFinite(rate) || Number.isNaN(rate) || rate <= 0) {
    throw new Error(
      `INVALID_CONVERSION_RATE: DEMO_USD_PER_ETH must be a positive finite number, got "${rateEnv}"`
    );
  }

  return rate;
}

/**
 * Converts a business amount in USD to blockchain-native wei using integer arithmetic.
 *
 * Formula:
 *   amountUsdCents = round(amountUsd * 100)
 *   usdPerEthCents = round(rate * 100)
 *   wei = (BigInt(amountUsdCents) * 10^18) / BigInt(usdPerEthCents)
 */
export function usdToWei(amountUsd: number, customRate?: number): bigint {
  if (
    typeof amountUsd !== "number" ||
    !Number.isFinite(amountUsd) ||
    Number.isNaN(amountUsd)
  ) {
    throw new Error(
      `INVALID_USD_AMOUNT: Amount must be a valid finite number, received ${amountUsd}`
    );
  }

  if (amountUsd <= 0) {
    throw new Error(
      `INVALID_USD_AMOUNT: Amount must be strictly greater than 0, received ${amountUsd}`
    );
  }

  const rate = customRate !== undefined ? customRate : getDemoUsdPerEth();
  if (
    typeof rate !== "number" ||
    !Number.isFinite(rate) ||
    Number.isNaN(rate) ||
    rate <= 0
  ) {
    throw new Error(
      `INVALID_CONVERSION_RATE: Conversion rate must be a positive finite number, received ${rate}`
    );
  }

  const amountUsdCents = BigInt(Math.round(amountUsd * 100));
  const usdPerEthCents = BigInt(Math.round(rate * 100));

  const wei = (amountUsdCents * WEI_PER_ETH) / usdPerEthCents;

  if (wei <= 0n) {
    throw new Error(
      `CONVERSION_UNDERFLOW: Amount ${amountUsd} USD yields 0 wei at rate ${rate} USD/ETH`
    );
  }

  return wei;
}

/**
 * Formats a native wei amount into human-readable ETH string (e.g. "1.0", "0.5").
 */
export function weiToEthDisplay(amountWei: bigint | string | number): string {
  const weiBig =
    typeof amountWei === "bigint"
      ? amountWei
      : BigInt(typeof amountWei === "string" ? amountWei.trim() : Math.round(amountWei));

  if (weiBig < 0n) {
    throw new Error(`INVALID_WEI_AMOUNT: Wei amount cannot be negative, got ${amountWei}`);
  }

  const integerPart = weiBig / WEI_PER_ETH;
  const remainder = weiBig % WEI_PER_ETH;

  if (remainder === 0n) {
    return `${integerPart}.0`;
  }

  const remainderStr = remainder.toString().padStart(18, "0").replace(/0+$/, "");
  return `${integerPart}.${remainderStr}`;
}

/**
 * Converts a native wei amount back to USD using integer arithmetic.
 */
export function weiToUsd(amountWei: bigint | string | number, customRate?: number): number {
  const weiBig =
    typeof amountWei === "bigint"
      ? amountWei
      : BigInt(typeof amountWei === "string" ? amountWei.trim() : Math.round(amountWei));

  const rate = customRate !== undefined ? customRate : getDemoUsdPerEth();
  const usdPerEthCents = BigInt(Math.round(rate * 100));

  const usdCents = (weiBig * usdPerEthCents) / WEI_PER_ETH;
  return Number(usdCents) / 100;
}
