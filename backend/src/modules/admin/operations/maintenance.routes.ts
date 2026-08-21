import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createMaintenanceExpenseHandler,
  deleteMaintenanceExpenseHandler,
  listMaintenanceExpensesHandler,
  maintenanceSummaryHandler,
  updateMaintenanceExpenseHandler,
} from "./maintenance.controller";

export const maintenanceRouter = Router();

maintenanceRouter.get("/expenses/summary", asyncHandler(maintenanceSummaryHandler));
maintenanceRouter.post("/expenses", asyncHandler(createMaintenanceExpenseHandler));
maintenanceRouter.get("/expenses", asyncHandler(listMaintenanceExpensesHandler));
maintenanceRouter.put("/expenses/:id", asyncHandler(updateMaintenanceExpenseHandler));
maintenanceRouter.delete("/expenses/:id", asyncHandler(deleteMaintenanceExpenseHandler));
