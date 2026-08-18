import { env } from "../../config/env";
import { BadRequestError, UnauthorizedError } from "../../lib/errors";

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpired() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt <= now) otpStore.delete(phone);
  }
}

export async function sendOtp(phone: string) {
  cleanExpired();

  const otp = generateOtp();
  otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS });

  const params = new URLSearchParams({
    variables_values: otp,
    route: "otp",
    numbers: phone,
  });

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: env.fast2smsApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json() as { return: boolean; message?: string };

  if (!data.return) {
    otpStore.delete(phone);
    throw new BadRequestError(data.message || "Failed to send OTP. Please try again.");
  }
}

export function verifyOtp(phone: string, otp: string): void {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new BadRequestError("No OTP requested for this number. Please request a new OTP.");
  }

  if (entry.expiresAt <= Date.now()) {
    otpStore.delete(phone);
    throw new UnauthorizedError("OTP has expired. Please request a new one.");
  }

  if (entry.otp !== otp) {
    throw new UnauthorizedError("Invalid OTP. Please try again.");
  }

  otpStore.delete(phone);
}
