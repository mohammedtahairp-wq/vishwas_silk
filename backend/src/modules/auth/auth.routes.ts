import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { verifyOtpHandler, logoutHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/verify-otp", asyncHandler(verifyOtpHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
