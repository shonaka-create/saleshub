import { CURRENCY_SYMBOLS } from "./constants";

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
