import { Request, Response } from "express";
import { z } from "zod";
import * as maintenanceService from "./maintenance.service";

const maintenanceCategorySchema = z.enum(["food", "machinery", "others"]);

function queryDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

const dateSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

const createSchema = z.object({
  category: maintenanceCategorySchema,
  amount: z.number().positive(),
  expense_date: dateSchema,
  description: z.string().min(1).max(500),
});

const updateSchema = z.object({
  category: maintenanceCategorySchema.optional(),
  amount: z.number().positive().optional(),
  expense_date: dateSchema.optional(),
  description: z.string().min(1).max(500).optional(),
});

export async function createMaintenanceExpenseHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const expense = await maintenanceService.createMaintenanceExpense(req.user!.id, {
    category: body.category,
    amount: body.amount,
    expenseDate: new Date(body.expense_date),
    description: body.description,
  });
  res.status(201).json(expense);
}

export async function updateMaintenanceExpenseHandler(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const expense = await maintenanceService.updateMaintenanceExpense(req.params.id, {
    category: body.category,
    amount: body.amount,
    expenseDate: body.expense_date ? new Date(body.expense_date) : undefined,
    description: body.description,
  });
  res.json(expense);
}

export async function deleteMaintenanceExpenseHandler(req: Request, res: Response) {
  await maintenanceService.deleteMaintenanceExpense(req.params.id);
  res.status(204).send();
}

export async function listMaintenanceExpensesHandler(req: Request, res: Response) {
  const { category, from, to } = req.query;
  const expenses = await maintenanceService.listMaintenanceExpenses({
    category: maintenanceCategorySchema.safeParse(category).success
      ? (category as "food" | "machinery" | "others")
      : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  res.json(expenses);
}

export async function maintenanceSummaryHandler(req: Request, res: Response) {
  const { from, to } = req.query;
  const summary = await maintenanceService.maintenanceSummary({
    from: queryDate(from),
    to: queryDate(to, true),
  });
  res.json(summary);
}
