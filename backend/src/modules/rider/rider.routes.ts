import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/requireRole";
import { createPickupHandler, myCustomersHandler, myPickupsHandler, priceAvailabilityHandler, customerProductsHandler, createBatchPickupHandler } from "./rider.controller";

export const riderRouter = Router();

riderRouter.use(authenticate, requireRole("rider"));

riderRouter.get("/customers", asyncHandler(myCustomersHandler));
riderRouter.get("/customers/:id/products", asyncHandler(customerProductsHandler));
riderRouter.post("/pickups", asyncHandler(createPickupHandler));
riderRouter.post("/pickups/batch", asyncHandler(createBatchPickupHandler));
riderRouter.get("/pickups", asyncHandler(myPickupsHandler));
riderRouter.get("/price-availability", asyncHandler(priceAvailabilityHandler));
