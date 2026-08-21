import { Router } from "express";
import { salariesRouter } from "./salaries.routes";
import { transportRouter } from "./transport.routes";
import { maintenanceRouter } from "./maintenance.routes";

export const operationsRouter = Router();

operationsRouter.use("/salaries", salariesRouter);
operationsRouter.use("/transport", transportRouter);
operationsRouter.use("/maintenance", maintenanceRouter);
