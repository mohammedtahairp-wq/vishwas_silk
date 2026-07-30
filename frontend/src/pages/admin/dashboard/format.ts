export const SERIES = "#10b981";
export const SERIES_GRADIENT = ["#10b981", "#34d399"];
export const ACCENT_COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#34d399", "#6ee7b7", "#a7f3d0"];

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export const inrCurrency = (n: number) => `₹${inr(n)}`;

export const num = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);

export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const frac = value / pow;
  const step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return step * pow;
}
