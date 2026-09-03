import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import type { EmployeeCategory, SalaryPaymentType, Unit } from "@prisma/client";

interface CreateEmployeeInput {
  name: string;
  phone?: string;
  category: EmployeeCategory;
  unit: Unit;
  monthlySalary: number;
}

interface UpdateEmployeeInput {
  name?: string;
  phone?: string | null;
  category?: EmployeeCategory;
  unit?: Unit;
  monthlySalary?: number;
  status?: "active" | "inactive";
}

export async function createEmployee(input: CreateEmployeeInput) {
  return prisma.employee.create({
    data: {
      name: input.name,
      phone: input.phone,
      category: input.category,
      unit: input.unit,
      monthlySalary: input.monthlySalary,
    },
  });
}

export async function listEmployees(category?: EmployeeCategory, unit?: Unit) {
  return prisma.employee.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(unit ? { unit } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  await getEmployeeById(id);
  return prisma.employee.update({ where: { id }, data: input });
}

export async function deleteEmployee(id: string) {
  await getEmployeeById(id);
  const payments = await prisma.salaryPayment.count({ where: { employeeId: id } });
  if (payments > 0) {
    throw new ConflictError(
      "Cannot delete an employee with salary records. Deactivate the employee instead."
    );
  }
  await prisma.employee.delete({ where: { id } });
}

export interface RecordSalaryPaymentInput {
  employeeId: string;
  type: SalaryPaymentType;
  unit: Unit;
  amount: number;
  month: number;
  year: number;
  paymentDate?: Date;
  note?: string;
}

export async function recordSalaryPayment(createdById: string, input: RecordSalaryPaymentInput) {
  await getEmployeeById(input.employeeId);
  return prisma.salaryPayment.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      unit: input.unit,
      amount: input.amount,
      month: input.month,
      year: input.year,
      paymentDate: input.paymentDate ?? new Date(),
      note: input.note,
      createdById,
    },
    include: {
      employee: { select: { name: true, category: true, unit: true } },
    },
  });
}

export interface ListSalaryPaymentsFilter {
  employeeId?: string;
  month?: number;
  year?: number;
  type?: SalaryPaymentType;
  unit?: Unit;
  from?: Date;
  to?: Date;
}

export async function listSalaryPayments(filter: ListSalaryPaymentsFilter) {
  return prisma.salaryPayment.findMany({
    where: {
      employeeId: filter.employeeId,
      month: filter.month,
      year: filter.year,
      type: filter.type,
      unit: filter.unit,
      paymentDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    include: {
      employee: { select: { name: true, category: true, unit: true } },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function deleteSalaryPayment(id: string) {
  const payment = await prisma.salaryPayment.findUnique({ where: { id } });
  if (!payment) throw new NotFoundError("Salary payment not found");
  await prisma.salaryPayment.delete({ where: { id } });
}

export interface SalarySummaryRow {
  employeeId: string;
  name: string;
  phone: string | null;
  category: EmployeeCategory;
  unit: Unit;
  status: "active" | "inactive";
  monthlySalary: number;
  advanceTotal: number;
  salaryPaidTotal: number;
  totalPaid: number;
  remaining: number;
}

export async function salaryMonthSummary(month: number, year: number, unit?: Unit) {
  const [employees, aggregates] = await Promise.all([
    prisma.employee.findMany({
      where: unit ? { unit } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.salaryPayment.groupBy({
      by: ["employeeId", "type"],
      where: { month, year, ...(unit ? { unit } : {}) },
      _sum: { amount: true },
    }),
  ]);

  const totals = new Map<string, { advance: number; salary: number }>();
  for (const row of aggregates) {
    const entry = totals.get(row.employeeId) ?? { advance: 0, salary: 0 };
    if (row.type === "advance") entry.advance += Number(row._sum.amount ?? 0);
    else entry.salary += Number(row._sum.amount ?? 0);
    totals.set(row.employeeId, entry);
  }

  const rows: SalarySummaryRow[] = employees.map((employee) => {
    const t = totals.get(employee.id) ?? { advance: 0, salary: 0 };
    const monthlySalary = Number(employee.monthlySalary);
    const totalPaid = t.advance + t.salary;
    return {
      employeeId: employee.id,
      name: employee.name,
      phone: employee.phone,
      category: employee.category,
      unit: employee.unit,
      status: employee.status,
      monthlySalary,
      advanceTotal: t.advance,
      salaryPaidTotal: t.salary,
      totalPaid,
      remaining: monthlySalary - totalPaid,
    };
  });

  const grandTotals = rows.reduce(
    (acc, row) => ({
      monthlySalary: acc.monthlySalary + row.monthlySalary,
      advanceTotal: acc.advanceTotal + row.advanceTotal,
      salaryPaidTotal: acc.salaryPaidTotal + row.salaryPaidTotal,
      remaining: acc.remaining + row.remaining,
    }),
    { monthlySalary: 0, advanceTotal: 0, salaryPaidTotal: 0, remaining: 0 }
  );

  return { month, year, rows, grandTotals };
}
