import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function loginHandler(req: Request, res: Response) {
  const { username, password } = loginSchema.parse(req.body);
  const result = await authService.login(username, password);
  res.json(result);
}

export async function logoutHandler(_req: Request, res: Response) {
  // Stateless JWT — nothing to invalidate server-side; client discards the token.
  res.status(200).json({ ok: true });
}
