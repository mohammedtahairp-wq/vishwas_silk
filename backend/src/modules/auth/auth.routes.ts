import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { sendOtpHandler, verifyOtpHandler, logoutHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/send-otp", asyncHandler(sendOtpHandler));
authRouter.post("/verify-otp", asyncHandler(verifyOtpHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
