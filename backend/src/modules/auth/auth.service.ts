import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { NotFoundError } from "../../lib/errors";
import { verifyOtp } from "./otp.service";

function normalizePhone(phone: string): string {
  return phone.replace(/^\+91/, "").replace(/^\+/, "");
}

export async function verifyOtpAndLogin(phone: string, otp: string) {
  await verifyOtp(phone, otp);

  const normalizedPhone = normalizePhone(phone);

  const user = await prisma.user.findUnique({ where: { loginPhone: normalizedPhone } });
  if (!user || user.status !== "active") {
    throw new NotFoundError("User not found");
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, linkedId: user.linkedId },
    env.jwtSecret
  );

  return { token, role: user.role };
}
