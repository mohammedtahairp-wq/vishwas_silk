import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/requireRole";
import { myPickupsHandler, myProfileHandler, myTransactionsHandler } from "./customer.controller";

export const customerRouter = Router();

customerRouter.use(authenticate, requireRole("customer"));

customerRouter.get("/profile", asyncHandler(myProfileHandler));
customerRouter.get("/pickups", asyncHandler(myPickupsHandler));
customerRouter.get("/transactions", asyncHandler(myTransactionsHandler));
