import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  assignRiderHandler,
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  setCustomerLoginHandler,
  setStatusHandler,
  updateCustomerHandler,
} from "./customers.controller";

export const customersRouter = Router();

customersRouter.post("/", asyncHandler(createCustomerHandler));
customersRouter.get("/", asyncHandler(listCustomersHandler));
customersRouter.get("/:id", asyncHandler(getCustomerHandler));
customersRouter.put("/:id", asyncHandler(updateCustomerHandler));
customersRouter.delete("/:id", asyncHandler(deleteCustomerHandler));
customersRouter.put("/:id/assign-rider", asyncHandler(assignRiderHandler));
customersRouter.put("/:id/login", asyncHandler(setCustomerLoginHandler));
customersRouter.put("/:id/status", asyncHandler(setStatusHandler));
