import { UnauthorizedError, BadRequestError } from "../../lib/errors";

interface WidgetTokenPayload {
  sub?: string;
  phone?: string;
  mobile?: string;
  identifier?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

function base64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

export function extractPhoneFromWidgetToken(widgetToken: string): string {
  const parts = widgetToken.split(".");
  if (parts.length < 2) {
    throw new BadRequestError("Invalid widget token format.");
  }

  let payload: WidgetTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new BadRequestError("Invalid widget token: could not decode payload.");
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new UnauthorizedError("Widget token has expired. Please verify OTP again.");
  }

  const phone =
    payload.phone ||
    payload.mobile ||
    payload.identifier ||
    payload.sub ||
    "";

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    throw new BadRequestError("Widget token does not contain a valid phone number.");
  }

  return digits.slice(-10);
}
