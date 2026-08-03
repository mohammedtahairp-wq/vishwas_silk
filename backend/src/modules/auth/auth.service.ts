import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { UnauthorizedError } from "../../lib/errors";

export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.status !== "active") {
    throw new UnauthorizedError("Invalid username or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid username or password");
  }

  // Non-expiring session token: the client persists it in localStorage, so a
  // login survives app/browser restarts until the user logs out manually (or
  // uninstalls the app, which clears storage). Logout is client-side.
  const token = jwt.sign(
    { sub: user.id, role: user.role, linkedId: user.linkedId },
    env.jwtSecret
  );

  return { token, role: user.role };
}
