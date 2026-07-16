import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { priceHistoryHandler, setPriceHandler } from "./pricing.controller";

export const pricingRouter = Router();

pricingRouter.post("/", asyncHandler(setPriceHandler));
pricingRouter.get("/", asyncHandler(priceHistoryHandler));
