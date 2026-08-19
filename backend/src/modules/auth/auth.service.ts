import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { NotFoundError } from "../../lib/errors";
import { extractPhoneFromWidgetToken } from "./otp.service";

export async function verifyTokenAndLogin(widgetToken: string) {
  const phone = extractPhoneFromWidgetToken(widgetToken);

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
