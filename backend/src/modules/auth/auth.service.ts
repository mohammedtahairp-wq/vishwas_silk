import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { UnauthorizedError, NotFoundError } from "../../lib/errors";
import { firebaseAuth } from "../../config/firebase";

function normalizePhone(firebasePhone: string): string {
  return firebasePhone.replace(/^\+91/, "").replace(/^\+/, "");
}

export async function verifyFirebaseAndLogin(idToken: string) {
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired verification code");
  }

  const firebasePhone = decoded.phone_number;
  if (!firebasePhone) {
    throw new UnauthorizedError("No phone number associated with this account");
  }

  const phone = normalizePhone(firebasePhone);

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
