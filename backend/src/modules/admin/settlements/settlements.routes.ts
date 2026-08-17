import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  previewSettlementHandler,
  generateSettlementHandler,
  listSettlementsHandler,
  markSettlementPaidHandler,
} from "./settlements.controller";

export const settlementsRouter = Router();

settlementsRouter.post("/preview", asyncHandler(previewSettlementHandler));
settlementsRouter.post("/generate", asyncHandler(generateSettlementHandler));
settlementsRouter.get("/", asyncHandler(listSettlementsHandler));
settlementsRouter.put("/:id/mark-paid", asyncHandler(markSettlementPaidHandler));
