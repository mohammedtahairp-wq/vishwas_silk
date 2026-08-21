import { Request, Response } from "express";
import { z } from "zod";
import * as transportService from "./transport.service";

const transportCategorySchema = z.enum(["diesel", "repair"]);

function queryDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

const createVehicleSchema = z.object({
  name: z.string().min(1),
  number: z.string().min(1),
});

const updateVehicleSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function createVehicleHandler(req: Request, res: Response) {
  const body = createVehicleSchema.parse(req.body);
  const vehicle = await transportService.createVehicle(body);
  res.status(201).json(vehicle);
}

export async function listVehiclesHandler(_req: Request, res: Response) {
  const vehicles = await transportService.listVehicles();
  res.json(vehicles);
}

export async function updateVehicleHandler(req: Request, res: Response) {
  const body = updateVehicleSchema.parse(req.body);
  const vehicle = await transportService.updateVehicle(req.params.id, body);
  res.json(vehicle);
}

export async function deleteVehicleHandler(req: Request, res: Response) {
  await transportService.deleteVehicle(req.params.id);
  res.status(204).send();
}

const dateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const createTransportExpenseSchema = z.object({
  vehicle_id: z.string().uuid(),
  category: transportCategorySchema,
  amount: z.number().positive(),
  expense_date: dateSchema,
  description: z.string().max(500).optional(),
});

const updateTransportExpenseSchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  category: transportCategorySchema.optional(),
  amount: z.number().positive().optional(),
  expense_date: dateSchema.optional(),
  description: z.string().max(500).nullable().optional(),
});

export async function createTransportExpenseHandler(req: Request, res: Response) {
  const body = createTransportExpenseSchema.parse(req.body);
  const expense = await transportService.createTransportExpense(req.user!.id, {
    vehicleId: body.vehicle_id,
    category: body.category,
    amount: body.amount,
    expenseDate: new Date(body.expense_date),
    description: body.description,
  });
  res.status(201).json(expense);
}

export async function updateTransportExpenseHandler(req: Request, res: Response) {
  const body = updateTransportExpenseSchema.parse(req.body);
  const expense = await transportService.updateTransportExpense(req.params.id, {
    vehicleId: body.vehicle_id,
    category: body.category,
    amount: body.amount,
    expenseDate: body.expense_date ? new Date(body.expense_date) : undefined,
    description: body.description,
  });
  res.json(expense);
}

export async function deleteTransportExpenseHandler(req: Request, res: Response) {
  await transportService.deleteTransportExpense(req.params.id);
  res.status(204).send();
}

export async function listTransportExpensesHandler(req: Request, res: Response) {
  const { vehicle_id, category, from, to } = req.query;
  const expenses = await transportService.listTransportExpenses({
    vehicleId: typeof vehicle_id === "string" ? vehicle_id : undefined,
    category: transportCategorySchema.safeParse(category).success
      ? (category as "diesel" | "repair")
      : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  res.json(expenses);
}

export async function transportSummaryHandler(req: Request, res: Response) {
  const { vehicle_id, from, to } = req.query;
  const summary = await transportService.transportSummary({
    vehicleId: typeof vehicle_id === "string" ? vehicle_id : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  res.json(summary);
}
