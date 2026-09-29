import { describe, it, expect } from "vitest";
import {
  usdToWei,
  weiToEthDisplay,
  weiToUsd,
  getDemoUsdPerEth,
  WEI_PER_ETH,
} from "@/server/blockchain/amounts";

describe("USD -> ETH -> Wei Blockchain Currency Conversion Unit Tests", () => {
  // Test Section 15: Required assertions at default DEMO_USD_PER_ETH = 1000
  it("converts $1,000 USD to exactly 1.0 ETH (1,000,000,000,000,000,000 wei)", () => {
    const wei = usdToWei(1000);
    expect(wei).toBe(1000000000000000000n);
    expect(wei).toBe(WEI_PER_ETH);
    expect(weiToEthDisplay(wei)).toBe("1.0");
  });

  it("converts $500 USD to exactly 0.5 ETH (500,000,000,000,000,000 wei)", () => {
    const wei = usdToWei(500);
    expect(wei).toBe(500000000000000000n);
    expect(weiToEthDisplay(wei)).toBe("0.5");
  });

  it("converts $100 USD to exactly 0.1 ETH (100,000,000,000,000,000 wei)", () => {
    const wei = usdToWei(100);
    expect(wei).toBe(100000000000000000n);
    expect(weiToEthDisplay(wei)).toBe("0.1");
  });

  it("converts $1 USD to exactly 0.001 ETH (1,000,000,000,000,000 wei)", () => {
    const wei = usdToWei(1);
    expect(wei).toBe(1000000000000000n);
    expect(weiToEthDisplay(wei)).toBe("0.001");
  });

  it("converts decimal USD amounts correctly: $1.50 -> 0.0015 ETH", () => {
    const wei = usdToWei(1.5);
    expect(wei).toBe(1500000000000000n);
    expect(weiToEthDisplay(wei)).toBe("0.0015");
  });

  it("converts custom rates properly: e.g. $2,000 USD/ETH", () => {
    const wei = usdToWei(1000, 2000);
    // At $2,000/ETH, $1,000 = 0.5 ETH
    expect(wei).toBe(500000000000000000n);
    expect(weiToEthDisplay(wei)).toBe("0.5");
  });

  it("converts wei back to USD cleanly via weiToUsd", () => {
    expect(weiToUsd(1000000000000000000n)).toBe(1000);
    expect(weiToUsd(500000000000000000n)).toBe(500);
    expect(weiToUsd(100000000000000000n)).toBe(100);
    expect(weiToUsd(1000000000000000n)).toBe(1);
    expect(weiToUsd(1500000000000000n)).toBe(1.5);
  });

  // Boundary & Error Validation
  it("rejects zero USD amount with INVALID_USD_AMOUNT", () => {
    expect(() => usdToWei(0)).toThrow(/INVALID_USD_AMOUNT/);
  });

  it("rejects negative USD amounts with INVALID_USD_AMOUNT", () => {
    expect(() => usdToWei(-100)).toThrow(/INVALID_USD_AMOUNT/);
    expect(() => usdToWei(-0.01)).toThrow(/INVALID_USD_AMOUNT/);
  });

  it("rejects NaN and non-finite values", () => {
    expect(() => usdToWei(NaN)).toThrow(/INVALID_USD_AMOUNT/);
    expect(() => usdToWei(Infinity)).toThrow(/INVALID_USD_AMOUNT/);
    expect(() => usdToWei(-Infinity)).toThrow(/INVALID_USD_AMOUNT/);
    // @ts-expect-error Testing invalid runtime input
    expect(() => usdToWei("1000")).toThrow(/INVALID_USD_AMOUNT/);
  });

  it("rejects invalid conversion rates", () => {
    expect(() => usdToWei(100, 0)).toThrow(/INVALID_CONVERSION_RATE/);
    expect(() => usdToWei(100, -500)).toThrow(/INVALID_CONVERSION_RATE/);
    expect(() => usdToWei(100, NaN)).toThrow(/INVALID_CONVERSION_RATE/);
    expect(() => usdToWei(100, Infinity)).toThrow(/INVALID_CONVERSION_RATE/);
  });

  it("formats wei to ETH display without floating-point artifacts", () => {
    expect(weiToEthDisplay(0n)).toBe("0.0");
    expect(weiToEthDisplay(10n ** 18n)).toBe("1.0");
    expect(weiToEthDisplay(2n * 10n ** 18n)).toBe("2.0");
    expect(weiToEthDisplay(1234500000000000000n)).toBe("1.2345");
  });

  it("verifies getDemoUsdPerEth defaults to 1000 if not set", () => {
    const rate = getDemoUsdPerEth();
    expect(rate).toBe(1000);
  });
});
