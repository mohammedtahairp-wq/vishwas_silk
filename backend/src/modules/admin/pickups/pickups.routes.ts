import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { createBatchPickupHandler, deletePickupHandler, listPickupsHandler, markPickupPaidHandler, updatePickupHandler } from "./pickups.controller";

export const pickupsRouter = Router();

pickupsRouter.get("/", asyncHandler(listPickupsHandler));
pickupsRouter.post("/", asyncHandler(createBatchPickupHandler));
pickupsRouter.put("/:id", asyncHandler(updatePickupHandler));
pickupsRouter.delete("/:id", asyncHandler(deletePickupHandler));
pickupsRouter.put("/:id/mark-paid", asyncHandler(markPickupPaidHandler));
