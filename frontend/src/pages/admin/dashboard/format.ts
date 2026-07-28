export const SERIES = "#6366f1";
export const SERIES_GRADIENT = ["#6366f1", "#818cf8"];
export const ACCENT_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#e879f9", "#f472b6"];

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
