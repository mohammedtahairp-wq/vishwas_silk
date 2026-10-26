import { Request, Response } from "express";
import { z } from "zod";
import * as salariesService from "./salaries.service";

const employeeCategorySchema = z.enum(["sheet_machine", "ovendry", "khalla_jala", "drivers_helpers"]);
const salaryPaymentTypeSchema = z.enum(["advance", "salary", "ot"]);
const attendanceStatusSchema = z.enum(["present", "absent"]);
const unitSchema = z.enum(["kolar", "sidlagatta", "ramnagar"]);

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6).optional(),
  category: employeeCategorySchema,
  unit: unitSchema,
  monthlySalary: z.number().nonnegative(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).nullable().optional(),
  category: employeeCategorySchema.optional(),
  unit: unitSchema.optional(),
  monthlySalary: z.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2000).max(2100);

function queryDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

export async function createEmployeeHandler(req: Request, res: Response) {
  const body = createEmployeeSchema.parse(req.body);
  const employee = await salariesService.createEmployee({
    name: body.name,
    phone: body.phone,
    category: body.category,
    unit: body.unit,
    monthlySalary: body.monthlySalary,
  });
  res.status(201).json(employee);
}

export async function listEmployeesHandler(req: Request, res: Response) {
  const { category, unit } = req.query;
  const parsed = employeeCategorySchema.safeParse(category);
  const parsedUnit = unitSchema.safeParse(unit);
  const employees = await salariesService.listEmployees(
    parsed.success ? parsed.data : undefined,
    parsedUnit.success ? parsedUnit.data : undefined
  );
  res.json(employees);
}

export async function updateEmployeeHandler(req: Request, res: Response) {
  const body = updateEmployeeSchema.parse(req.body);
  const employee = await salariesService.updateEmployee(req.params.id, body);
  res.json(employee);
}

export async function deleteEmployeeHandler(req: Request, res: Response) {
  await salariesService.deleteEmployee(req.params.id);
  res.status(204).send();
}

const recordPaymentSchema = z.object({
  employee_id: z.string().uuid(),
  type: salaryPaymentTypeSchema,
  unit: unitSchema,
  amount: z.number().positive(),
  month: monthSchema,
  year: yearSchema,
  payment_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  note: z.string().max(500).optional(),
});

export async function recordSalaryPaymentHandler(req: Request, res: Response) {
  const body = recordPaymentSchema.parse(req.body);
  const payment = await salariesService.recordSalaryPayment(req.user!.id, {
    employeeId: body.employee_id,
    type: body.type,
    unit: body.unit,
    amount: body.amount,
    month: body.month,
    year: body.year,
    paymentDate: body.payment_date ? new Date(body.payment_date) : undefined,
    note: body.note,
  });
  res.status(201).json(payment);
}

export async function listSalaryPaymentsHandler(req: Request, res: Response) {
  const { employee_id, month, year, type, unit, from, to } = req.query;
  const payments = await salariesService.listSalaryPayments({
    employeeId: typeof employee_id === "string" ? employee_id : undefined,
    month: month !== undefined ? monthSchema.parse(month) : undefined,
    year: year !== undefined ? yearSchema.parse(year) : undefined,
    type: salaryPaymentTypeSchema.safeParse(type).success
      ? (type as "advance" | "salary" | "ot")
      : undefined,
    unit: unitSchema.safeParse(unit).success ? (unit as "kolar" | "sidlagatta" | "ramnagar") : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  res.json(payments);
}

export async function deleteSalaryPaymentHandler(req: Request, res: Response) {
  await salariesService.deleteSalaryPayment(req.params.id);
  res.status(204).send();
}

export async function salaryMonthSummaryHandler(req: Request, res: Response) {
  const query = z
    .object({
      month: monthSchema,
      year: yearSchema,
      unit: unitSchema.optional(),
    })
    .parse(req.query);
  const summary = await salariesService.salaryMonthSummary(query.month, query.year, query.unit);
  res.json(summary);
}

const setAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Date must be YYYY-MM-DD"),
  status: attendanceStatusSchema,
  unit: unitSchema,
});

export async function setAttendanceHandler(req: Request, res: Response) {
  const body = setAttendanceSchema.parse(req.body);
  const attendance = await salariesService.setAttendance(req.user!.id, {
    employeeId: body.employee_id,
    date: new Date(body.date),
    status: body.status,
    unit: body.unit,
  });
  res.status(201).json(attendance);
}

export async function listAttendanceHandler(req: Request, res: Response) {
  const { date, month, year, unit, employee_id } = req.query;
  const attendance = await salariesService.listAttendance({
    date: queryDate(date),
    month: month !== undefined ? monthSchema.parse(month) : undefined,
    year: year !== undefined ? yearSchema.parse(year) : undefined,
    unit: unitSchema.safeParse(unit).success ? (unit as "kolar" | "sidlagatta" | "ramnagar") : undefined,
    employeeId: typeof employee_id === "string" ? employee_id : undefined,
  });
  res.json(attendance);
}

export async function deleteAttendanceHandler(req: Request, res: Response) {
  await salariesService.deleteAttendance(req.params.id);
  res.status(204).send();
}
