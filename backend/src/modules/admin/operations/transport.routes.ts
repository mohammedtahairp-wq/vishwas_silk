import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createTransportExpenseHandler,
  createVehicleHandler,
  deleteTransportExpenseHandler,
  deleteVehicleHandler,
  listTransportExpensesHandler,
  listVehiclesHandler,
  transportSummaryHandler,
  updateTransportExpenseHandler,
  updateVehicleHandler,
} from "./transport.controller";

export const transportRouter = Router();

transportRouter.post("/vehicles", asyncHandler(createVehicleHandler));
transportRouter.get("/vehicles", asyncHandler(listVehiclesHandler));
transportRouter.put("/vehicles/:id", asyncHandler(updateVehicleHandler));
transportRouter.delete("/vehicles/:id", asyncHandler(deleteVehicleHandler));

transportRouter.get("/expenses/summary", asyncHandler(transportSummaryHandler));
transportRouter.post("/expenses", asyncHandler(createTransportExpenseHandler));
transportRouter.get("/expenses", asyncHandler(listTransportExpensesHandler));
transportRouter.put("/expenses/:id", asyncHandler(updateTransportExpenseHandler));
transportRouter.delete("/expenses/:id", asyncHandler(deleteTransportExpenseHandler));
