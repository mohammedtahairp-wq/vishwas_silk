import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/requireRole";
import { customersRouter } from "./customers/customers.routes";
import { ridersRouter } from "./riders/riders.routes";
import { productsRouter } from "./products/products.routes";
import { pricingRouter } from "./pricing/pricing.routes";
import { pickupsRouter } from "./pickups/pickups.routes";
import { settlementsRouter } from "./settlements/settlements.routes";
import { citiesRouter } from "./cities/cities.routes";
import { operationsRouter } from "./operations/operations.routes";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin"));

adminRouter.use("/cities", citiesRouter);
adminRouter.use("/customers", customersRouter);
adminRouter.use("/riders", ridersRouter);
adminRouter.use("/products", productsRouter);
adminRouter.use("/pricing", pricingRouter);
adminRouter.use("/pickups", pickupsRouter);
adminRouter.use("/settlements", settlementsRouter);
adminRouter.use("/operations", operationsRouter);
