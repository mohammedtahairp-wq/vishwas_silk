import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import type { MaintenanceExpenseCategory } from "@prisma/client";

export interface MaintenanceExpenseFilter {
  category?: MaintenanceExpenseCategory;
  from?: Date;
  to?: Date;
}

export async function createMaintenanceExpense(
  createdById: string,
  input: {
    category: MaintenanceExpenseCategory;
    amount: number;
    expenseDate: Date;
    description: string;
  }
) {
  return prisma.maintenanceExpense.create({
    data: { ...input, createdById },
  });
}

export async function updateMaintenanceExpense(
  id: string,
  input: {
    category?: MaintenanceExpenseCategory;
    amount?: number;
    expenseDate?: Date;
    description?: string;
  }
) {
  const expense = await prisma.maintenanceExpense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("Maintenance expense not found");
  return prisma.maintenanceExpense.update({ where: { id }, data: input });
}

export async function deleteMaintenanceExpense(id: string) {
  const expense = await prisma.maintenanceExpense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("Maintenance expense not found");
  await prisma.maintenanceExpense.delete({ where: { id } });
}

export async function listMaintenanceExpenses(filter: MaintenanceExpenseFilter) {
  return prisma.maintenanceExpense.findMany({
    where: {
      category: filter.category,
      expenseDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });
}

export interface MaintenanceSummary {
  foodTotal: number;
  machineryTotal: number;
  othersTotal: number;
  grandTotal: number;
}

export async function maintenanceSummary(
  filter: MaintenanceExpenseFilter
): Promise<MaintenanceSummary> {
  const byCategory = await prisma.maintenanceExpense.groupBy({
    by: ["category"],
    where: {
      category: filter.category,
      expenseDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    _sum: { amount: true },
  });

  const total = (category: string) =>
    Number(byCategory.find((r) => r.category === category)?._sum.amount ?? 0);

  const foodTotal = total("food");
  const machineryTotal = total("machinery");
  const othersTotal = total("others");

  return {
    foodTotal,
    machineryTotal,
    othersTotal,
    grandTotal: foodTotal + machineryTotal + othersTotal,
  };
}
