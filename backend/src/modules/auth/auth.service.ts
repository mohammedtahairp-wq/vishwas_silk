import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { NotFoundError, BadRequestError, UnauthorizedError } from "../../lib/errors";

function base64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function isValidWidgetToken(widgetToken: string): boolean {
  const parts = widgetToken.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload.requestId && payload.companyId;
  } catch {
    return false;
  }
}

export async function checkPhoneRegistered(phone: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { loginPhone: phone } });
  return !!(user && user.status === "active");
}

export async function verifyTokenAndLogin(widgetToken: string, phone: string) {
  if (!isValidWidgetToken(widgetToken)) {
    throw new BadRequestError("Invalid widget token.");
  }

  const parts = widgetToken.split(".");
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  if (payload.companyId !== 562052) {
    throw new UnauthorizedError("Token does not belong to this account.");
  }

  const user = await prisma.user.findUnique({ where: { loginPhone: phone } });
  if (!user || user.status !== "active") {
    throw new NotFoundError("User not found");
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, linkedId: user.linkedId },
    env.jwtSecret
  );

  return { token, role: user.role };
}
