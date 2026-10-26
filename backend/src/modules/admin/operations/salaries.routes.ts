import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createEmployeeHandler,
  deleteAttendanceHandler,
  deleteEmployeeHandler,
  deleteSalaryPaymentHandler,
  listAttendanceHandler,
  listEmployeesHandler,
  listSalaryPaymentsHandler,
  recordSalaryPaymentHandler,
  salaryMonthSummaryHandler,
  setAttendanceHandler,
  updateEmployeeHandler,
} from "./salaries.controller";

export const salariesRouter = Router();

salariesRouter.get("/summary", asyncHandler(salaryMonthSummaryHandler));
salariesRouter.post("/payments", asyncHandler(recordSalaryPaymentHandler));
salariesRouter.get("/payments", asyncHandler(listSalaryPaymentsHandler));
salariesRouter.delete("/payments/:id", asyncHandler(deleteSalaryPaymentHandler));

salariesRouter.post("/attendance", asyncHandler(setAttendanceHandler));
salariesRouter.get("/attendance", asyncHandler(listAttendanceHandler));
salariesRouter.delete("/attendance/:id", asyncHandler(deleteAttendanceHandler));

salariesRouter.post("/employees", asyncHandler(createEmployeeHandler));
salariesRouter.get("/employees", asyncHandler(listEmployeesHandler));
salariesRouter.put("/employees/:id", asyncHandler(updateEmployeeHandler));
salariesRouter.delete("/employees/:id", asyncHandler(deleteEmployeeHandler));
