import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { loginHandler, logoutHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(loginHandler));
authRouter.post("/logout", asyncHandler(logoutHandler));
