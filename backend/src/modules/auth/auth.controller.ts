import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import * as otpService from "./otp.service";

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number"),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone must be a 10-digit number"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
});

export async function sendOtpHandler(req: Request, res: Response) {
  const { phone } = sendOtpSchema.parse(req.body);
  await otpService.sendOtp(phone);
  res.json({ ok: true, message: "OTP sent successfully" });
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { phone, otp } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtpAndLogin(phone, otp);
  res.json(result);
}

export async function logoutHandler(_req: Request, res: Response) {
  res.status(200).json({ ok: true });
}
