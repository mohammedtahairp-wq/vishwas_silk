import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const verifyTokenSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});

export async function verifyTokenHandler(req: Request, res: Response) {
  const { idToken } = verifyTokenSchema.parse(req.body);
  const result = await authService.verifyFirebaseAndLogin(idToken);
  res.json(result);
}

export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ ok: true });
}
