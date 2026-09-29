export function money(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 100_000) return `${sign}$${Math.round(v / 1_000)}k`;
  if (v >= 1_000) return `${sign}$${(v / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(v)}`;
}

export function pct(n: number, digits = 1): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(n * 100).toFixed(digits)}%`;
}

export function signedPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${(Math.abs(n) * 100).toFixed(digits)}%`;
}

export function axisMoney(n: number): string {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  if (v >= 1_000_000) {
    const digits = v >= 10_000_000 ? 0 : 1;
    return `${sign}$${(v / 1_000_000).toFixed(digits)}M`;
  }
  if (v >= 1_000) return `${sign}$${Math.round(v / 1_000)}k`;
  return `${sign}$${Math.round(v)}`;
}

export function count(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
