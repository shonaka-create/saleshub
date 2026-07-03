import { CURRENCY_SYMBOLS } from "./constants";

export type FxRates = Record<string, number>;

export function parseFxRates(json: string): FxRates {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// amount (currency 建て) を基準通貨に換算する。レート未設定なら 1:1。
export function toBase(amount: number, currency: string, baseCurrency: string, rates: FxRates): number {
  if (currency === baseCurrency) return amount;
  const rate = rates[currency];
  return rate ? amount * rate : amount;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";
  const digits = currency === "JPY" ? 0 : 0;
  return `${symbol}${amount.toLocaleString("ja-JP", { maximumFractionDigits: digits })}`;
}

export function formatCompact(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "";
  if (Math.abs(amount) >= 100000000) return `${symbol}${(amount / 100000000).toFixed(1)}億`;
  if (Math.abs(amount) >= 10000 && currency === "JPY")
    return `${symbol}${Math.round(amount / 10000).toLocaleString()}万`;
  return `${symbol}${amount.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
}
