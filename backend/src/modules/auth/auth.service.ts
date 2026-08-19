import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { UnauthorizedError, NotFoundError } from "../../lib/errors";
import { verifyMsg91Token } from "./otp.service";

function normalizePhone(phone: string): string {
  return phone.replace(/^\+91/, "").replace(/^\+/, "");
}

export async function verifyOtpAndLogin(phone: string, token: string) {
  await verifyMsg91Token(token);

  const normalizedPhone = normalizePhone(phone);

  const user = await prisma.user.findUnique({ where: { loginPhone: normalizedPhone } });
  if (!user || user.status !== "active") {
    throw new NotFoundError("User not found");
  }

  const jwtToken = jwt.sign(
    { sub: user.id, role: user.role, linkedId: user.linkedId },
    env.jwtSecret
  );

  return { token: jwtToken, role: user.role };
}
