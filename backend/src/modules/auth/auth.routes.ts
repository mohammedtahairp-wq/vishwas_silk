import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { verifyTokenHandler, logoutHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/verify-token", asyncHandler(verifyTokenHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
