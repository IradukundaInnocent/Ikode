export type CurrencyCode = "FRW" | "USD" | "EUR" | "GBP";

export interface CurrencyConfig {
  symbol: string;
  rate: number; // conversion from FRW (Multiplier: FRW * rate)
  suffix: string;
  label: string;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  FRW: { symbol: "", rate: 1, suffix: " FRW", label: "Rwandan Franc (FRW)" },
  USD: { symbol: "$", rate: 1 / 1300, suffix: "", label: "US Dollar (USD)" },
  EUR: { symbol: "€", rate: 1 / 1400, suffix: "", label: "Euro (EUR)" },
  GBP: { symbol: "£", rate: 1 / 1650, suffix: "", label: "British Pound (GBP)" },
};

export function formatPrice(amountFRW: number, currencyCode: CurrencyCode = "FRW"): string {
  const config = CURRENCY_CONFIGS[currencyCode] || CURRENCY_CONFIGS.FRW;
  const converted = amountFRW * config.rate;
  
  // FRW usually has no cents/decimals, standard currency like USD/EUR has 2 decimal digits
  if (currencyCode === "FRW") {
    return `${config.symbol}${Math.round(converted).toLocaleString()}${config.suffix}`;
  } else {
    // If it's a very low amount or round, format neatly
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${config.symbol}${formatted}${config.suffix}`;
  }
}

// Global active currency helper
export function getSavedCurrency(): CurrencyCode {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("ikode_active_currency");
    if (saved === "FRW" || saved === "USD" || saved === "EUR" || saved === "GBP") {
      return saved;
    }
  }
  return "FRW";
}

export function saveCurrency(currency: CurrencyCode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ikode_active_currency", currency);
    // Dispatch instant custom event for cross-component reactive sync
    window.dispatchEvent(new Event("ikode_currency_changed"));
  }
}
