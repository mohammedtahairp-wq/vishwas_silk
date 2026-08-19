import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number"),
  token: z.string().min(1, "Token is required"),
});

export async function verifyOtpHandler(req: Request, res: Response) {
  const { phone, token } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtpAndLogin(phone, token);
  res.json(result);
}

export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ ok: true });
}
