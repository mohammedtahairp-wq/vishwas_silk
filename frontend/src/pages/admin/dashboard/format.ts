// Single brand hue for magnitude encoding — matches the app's indigo accent.
// A single-series chart carries identity by position/label, so one hue is correct.
export const SERIES = "#4f46e5"; // indigo-600

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

export const inrCurrency = (n: number) => `₹${inr(n)}`;

export const num = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);

/** "Nice" upper bound for an axis so gridlines land on round numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const frac = value / pow;
  const step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return step * pow;
}
