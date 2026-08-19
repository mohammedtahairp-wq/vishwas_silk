import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const verifyOtpSchema = z.object({
  token: z.string().min(1, "Widget token is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number"),
});

export async function verifyOtpHandler(req: Request, res: Response) {
  const { token, phone } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyTokenAndLogin(token, phone);
  res.json(result);
}

export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ ok: true });
}
