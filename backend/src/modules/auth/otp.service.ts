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

function isJwt(str: string): boolean {
  const parts = str.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return typeof payload === "object" && payload !== null;
  } catch {
    return false;
  }
}

function findJwtInObject(obj: unknown): string | null {
  if (typeof obj === "string" && isJwt(obj)) return obj;

  if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    const preferredKeys = [
      "token",
      "access_token",
      "accessToken",
      "tokenAuth",
      "jwt",
      "access_token_jwt",
    ];
    for (const key of preferredKeys) {
      if (typeof record[key] === "string" && isJwt(record[key] as string)) {
        return record[key] as string;
      }
    }
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === "string" && isJwt(val)) return val;
      if (typeof val === "object" && val !== null) {
        const found = findJwtInObject(val);
        if (found) return found;
      }
    }
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findJwtInObject(item);
      if (found) return found;
    }
  }

  return null;
}

export function extractPhoneFromWidgetToken(widgetToken: string): string {
  let tokenStr = widgetToken.trim();

  if (tokenStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(tokenStr);
      const found = findJwtInObject(parsed);
      if (found) tokenStr = found;
      else {
        const phoneFromJson =
          parsed.phone ||
          parsed.mobile ||
          parsed.identifier ||
          parsed.sub ||
          "";
        const digits = phoneFromJson.replace(/\D/g, "");
        if (digits.length >= 10) return digits.slice(-10);
      }
    } catch {
      // not JSON, try as raw token
    }
  }

  if (isJwt(tokenStr)) {
    const parts = tokenStr.split(".");
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
    if (digits.length >= 10) return digits.slice(-10);
  }

  throw new BadRequestError("Could not extract phone number from widget response. Please try again.");
}
