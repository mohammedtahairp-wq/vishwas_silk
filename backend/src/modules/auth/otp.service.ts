import { env } from "../../config/env";
import { BadRequestError, UnauthorizedError } from "../../lib/errors";

interface OtpEntry {
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000;

function cleanExpired() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt <= now) otpStore.delete(phone);
  }
}

export async function sendOtp(phone: string) {
  cleanExpired();

  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile: `91${phone}`,
      authkey: env.msg91AuthToken,
      template_id: env.msg91TemplateId,
      otp_length: 4,
      otp_expiry: 5,
    }),
  });

  const data = (await res.json()) as { type: string; message?: string };
  console.log("[MSG91 Send]", JSON.stringify(data));

  if (data.type !== "success") {
    throw new BadRequestError(data.message || "Failed to send OTP. Please try again.");
  }

  otpStore.set(phone, { expiresAt: Date.now() + OTP_TTL_MS });
}

export async function verifyOtp(phone: string, otp: string) {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new BadRequestError("No OTP requested for this number. Please request a new OTP.");
  }

  if (entry.expiresAt <= Date.now()) {
    otpStore.delete(phone);
    throw new UnauthorizedError("OTP has expired. Please request a new one.");
  }

  const res = await fetch("https://control.msg91.com/api/v5/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile: `91${phone}`,
      otp: Number(otp),
      authkey: env.msg91AuthToken,
    }),
  });

  const data = (await res.json()) as { type: string; message?: string };
  console.log("[MSG91 Verify]", JSON.stringify(data));

  otpStore.delete(phone);

  if (data.type !== "success") {
    throw new UnauthorizedError(data.message || "Invalid OTP. Please try again.");
  }
}
