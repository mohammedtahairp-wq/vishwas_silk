import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createRiderHandler,
  deleteRiderHandler,
  getRiderCustomersHandler,
  getRiderHandler,
  listRidersHandler,
  updateRiderHandler,
} from "./riders.controller";

export const ridersRouter = Router();

ridersRouter.post("/", asyncHandler(createRiderHandler));
ridersRouter.get("/", asyncHandler(listRidersHandler));
ridersRouter.get("/:id", asyncHandler(getRiderHandler));
ridersRouter.put("/:id", asyncHandler(updateRiderHandler));
ridersRouter.delete("/:id", asyncHandler(deleteRiderHandler));
ridersRouter.get("/:id/customers", asyncHandler(getRiderCustomersHandler));
