/**
 * Normalizes a login phone to the bare 10-digit local format used by the
 * OTP login flow (`/auth/check-phone` requires exactly 10 digits).
 * Strips non-digits and drops a leading country code (e.g. "91") so values
 * like "+91 98765 43210" or "919876543210" all resolve to "9876543210".
 */
export function normalizeLoginPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
