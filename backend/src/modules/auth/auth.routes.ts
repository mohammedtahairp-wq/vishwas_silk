import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { checkPhoneHandler, verifyOtpHandler, logoutHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/check-phone", asyncHandler(checkPhoneHandler));
authRouter.post("/verify-otp", asyncHandler(verifyOtpHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
