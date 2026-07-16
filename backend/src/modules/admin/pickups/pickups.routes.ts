import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import { listPickupsHandler } from "./pickups.controller";

export const pickupsRouter = Router();

pickupsRouter.get("/", asyncHandler(listPickupsHandler));
