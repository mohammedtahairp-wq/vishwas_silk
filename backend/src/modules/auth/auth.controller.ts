import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";

const verifyOtpSchema = z.object({
  token: z.string().min(1, "Widget token is required"),
});

export async function verifyOtpHandler(req: Request, res: Response) {
  const { token } = verifyOtpSchema.parse(req.body);
  console.log("[VERIFY-OTP] Raw token data:", token);
  const result = await authService.verifyTokenAndLogin(token);
  res.json(result);
}

export async function debugWidgetHandler(req: Request, res: Response) {
  console.log("[DEBUG-WIDGET] Body:", JSON.stringify(req.body));
  res.json({ received: req.body });
}

export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ ok: true });
}
