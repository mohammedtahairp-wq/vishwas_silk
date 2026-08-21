import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createEmployeeHandler,
  deleteEmployeeHandler,
  deleteSalaryPaymentHandler,
  listEmployeesHandler,
  listSalaryPaymentsHandler,
  recordSalaryPaymentHandler,
  salaryMonthSummaryHandler,
  updateEmployeeHandler,
} from "./salaries.controller";

export const salariesRouter = Router();

salariesRouter.get("/summary", asyncHandler(salaryMonthSummaryHandler));
salariesRouter.post("/payments", asyncHandler(recordSalaryPaymentHandler));
salariesRouter.get("/payments", asyncHandler(listSalaryPaymentsHandler));
salariesRouter.delete("/payments/:id", asyncHandler(deleteSalaryPaymentHandler));

salariesRouter.post("/employees", asyncHandler(createEmployeeHandler));
salariesRouter.get("/employees", asyncHandler(listEmployeesHandler));
salariesRouter.put("/employees/:id", asyncHandler(updateEmployeeHandler));
salariesRouter.delete("/employees/:id", asyncHandler(deleteEmployeeHandler));
