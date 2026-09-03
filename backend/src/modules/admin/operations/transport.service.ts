import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import type { TransportExpenseCategory, Unit } from "@prisma/client";

interface CreateVehicleInput {
  name: string;
  number: string;
  unit: Unit;
}

interface UpdateVehicleInput {
  name?: string;
  number?: string;
  unit?: Unit;
  status?: "active" | "inactive";
}

export async function createVehicle(input: CreateVehicleInput) {
  const existing = await prisma.vehicle.findUnique({ where: { number: input.number } });
  if (existing) throw new ConflictError("A vehicle with that number already exists");
  return prisma.vehicle.create({ data: input });
}

export async function listVehicles(unit?: Unit) {
  return prisma.vehicle.findMany({
    where: unit ? { unit } : undefined,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  return vehicle;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput) {
  await getVehicleById(id);
  if (input.number) {
    const existing = await prisma.vehicle.findUnique({ where: { number: input.number } });
    if (existing && existing.id !== id) {
      throw new ConflictError("A vehicle with that number already exists");
    }
  }
  return prisma.vehicle.update({ where: { id }, data: input });
}

export async function deleteVehicle(id: string) {
  await getVehicleById(id);
  const expenses = await prisma.transportExpense.count({ where: { vehicleId: id } });
  if (expenses > 0) {
    throw new ConflictError(
      "Cannot delete a vehicle with recorded expenses. Deactivate it instead."
    );
  }
  await prisma.vehicle.delete({ where: { id } });
}

export interface TransportExpenseFilter {
  vehicleId?: string;
  category?: TransportExpenseCategory;
  unit?: Unit;
  from?: Date;
  to?: Date;
}

export async function createTransportExpense(
  createdById: string,
  input: {
    vehicleId: string;
    category: TransportExpenseCategory;
    unit: Unit;
    amount: number;
    expenseDate: Date;
    description?: string;
  }
) {
  await getVehicleById(input.vehicleId);
  return prisma.transportExpense.create({
    data: {
      vehicleId: input.vehicleId,
      category: input.category,
      unit: input.unit,
      amount: input.amount,
      expenseDate: input.expenseDate,
      description: input.description,
      createdById,
    },
    include: { vehicle: { select: { name: true, number: true } } },
  });
}

export async function updateTransportExpense(
  id: string,
  input: {
    vehicleId?: string;
    category?: TransportExpenseCategory;
    unit?: Unit;
    amount?: number;
    expenseDate?: Date;
    description?: string | null;
  }
) {
  const expense = await prisma.transportExpense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("Transport expense not found");
  if (input.vehicleId) await getVehicleById(input.vehicleId);
  return prisma.transportExpense.update({
    where: { id },
    data: input,
    include: { vehicle: { select: { name: true, number: true } } },
  });
}

export async function deleteTransportExpense(id: string) {
  const expense = await prisma.transportExpense.findUnique({ where: { id } });
  if (!expense) throw new NotFoundError("Transport expense not found");
  await prisma.transportExpense.delete({ where: { id } });
}

export async function listTransportExpenses(filter: TransportExpenseFilter) {
  return prisma.transportExpense.findMany({
    where: {
      vehicleId: filter.vehicleId,
      category: filter.category,
      unit: filter.unit,
      expenseDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    include: { vehicle: { select: { name: true, number: true } } },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });
}

export interface TransportSummary {
  dieselTotal: number;
  repairTotal: number;
  grandTotal: number;
  byVehicle: {
    vehicleId: string;
    vehicleName: string;
    vehicleNumber: string;
    dieselTotal: number;
    repairTotal: number;
    total: number;
  }[];
}

export async function transportSummary(filter: TransportExpenseFilter): Promise<TransportSummary> {
  const where = {
    vehicleId: filter.vehicleId,
    category: filter.category,
    unit: filter.unit,
    expenseDate: filter.from || filter.to
      ? { gte: filter.from, lte: filter.to }
      : undefined,
  };

  const [byCategory, rows] = await Promise.all([
    prisma.transportExpense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
    }),
    prisma.transportExpense.findMany({
      where,
      select: {
        category: true,
        amount: true,
        vehicle: { select: { id: true, name: true, number: true } },
      },
    }),
  ]);

  const diesel =
    byCategory.find((r) => r.category === "diesel")?._sum.amount ?? 0;
  const repair =
    byCategory.find((r) => r.category === "repair")?._sum.amount ?? 0;

  const vehicleMap = new Map<string, TransportSummary["byVehicle"][number]>();
  for (const row of rows) {
    let entry = vehicleMap.get(row.vehicle.id);
    if (!entry) {
      entry = {
        vehicleId: row.vehicle.id,
        vehicleName: row.vehicle.name,
        vehicleNumber: row.vehicle.number,
        dieselTotal: 0,
        repairTotal: 0,
        total: 0,
      };
      vehicleMap.set(row.vehicle.id, entry);
    }
    const amount = Number(row.amount);
    entry.total += amount;
    if (row.category === "diesel") entry.dieselTotal += amount;
    else entry.repairTotal += amount;
  }

  return {
    dieselTotal: Number(diesel),
    repairTotal: Number(repair),
    grandTotal: Number(diesel) + Number(repair),
    byVehicle: [...vehicleMap.values()].sort((a, b) => b.total - a.total),
  };
}

export interface DieselLogFilter {
  vehicleId?: string;
  riderId?: string;
  unit?: Unit;
  from?: Date;
  to?: Date;
}

export async function listDieselLogs(filter: DieselLogFilter) {
  return prisma.dieselLog.findMany({
    where: {
      vehicleId: filter.vehicleId,
      riderId: filter.riderId,
      unit: filter.unit,
      dieselDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    include: {
      vehicle: { select: { name: true, number: true } },
      rider: { select: { name: true, phone: true } },
    },
    orderBy: [{ dieselDate: "desc" }, { createdAt: "desc" }],
  });
}

export interface DieselLogSummary {
  totalAmount: number;
  totalKm: number;
  count: number;
}

export async function dieselLogSummary(filter: DieselLogFilter): Promise<DieselLogSummary> {
  const rows = await prisma.dieselLog.findMany({
    where: {
      vehicleId: filter.vehicleId,
      riderId: filter.riderId,
      unit: filter.unit,
      dieselDate: filter.from || filter.to
        ? { gte: filter.from, lte: filter.to }
        : undefined,
    },
    select: { dieselAmount: true, kmRun: true },
  });
  return {
    totalAmount: rows.reduce((s, r) => s + Number(r.dieselAmount), 0),
    totalKm: rows.reduce((s, r) => s + Number(r.kmRun), 0),
    count: rows.length,
  };
}

export interface VehicleReport {
  vehicle: { id: string; name: string; number: string; unit: Unit };
  dieselLogs: Awaited<ReturnType<typeof listDieselLogs>>;
  expenses: Awaited<ReturnType<typeof listTransportExpenses>>;
  totals: {
    dieselLogAmount: number;
    dieselExpenseAmount: number;
    repairExpenseAmount: number;
    totalKm: number;
  };
}

export async function vehicleReport(
  vehicleId: string,
  filter: { from?: Date; to?: Date } = {}
): Promise<VehicleReport> {
  const vehicle = await getVehicleById(vehicleId);
  const [dieselLogs, expenses] = await Promise.all([
    listDieselLogs({ vehicleId, from: filter.from, to: filter.to }),
    listTransportExpenses({ vehicleId, from: filter.from, to: filter.to }),
  ]);

  const dieselLogAmount = dieselLogs.reduce((s, l) => s + Number(l.dieselAmount), 0);
  const dieselExpenseAmount = expenses
    .filter((e) => e.category === "diesel")
    .reduce((s, e) => s + Number(e.amount), 0);
  const repairExpenseAmount = expenses
    .filter((e) => e.category === "repair")
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalKm = dieselLogs.reduce((s, l) => s + Number(l.kmRun), 0);

  return {
    vehicle: { id: vehicle.id, name: vehicle.name, number: vehicle.number, unit: vehicle.unit },
    dieselLogs,
    expenses,
    totals: { dieselLogAmount, dieselExpenseAmount, repairExpenseAmount, totalKm },
  };
}

export interface RiderReport {
  rider: { id: string; name: string; phone: string | null };
  dieselLogs: Awaited<ReturnType<typeof listDieselLogs>>;
  totals: {
    totalAmount: number;
    totalKm: number;
    count: number;
  };
}

export async function riderDieselReport(
  riderId: string,
  filter: { from?: Date; to?: Date } = {}
): Promise<RiderReport> {
  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) throw new NotFoundError("Rider not found");

  const dieselLogs = await listDieselLogs({ riderId, from: filter.from, to: filter.to });
  return {
    rider: { id: rider.id, name: rider.name, phone: rider.phone },
    dieselLogs,
    totals: {
      totalAmount: dieselLogs.reduce((s, l) => s + Number(l.dieselAmount), 0),
      totalKm: dieselLogs.reduce((s, l) => s + Number(l.kmRun), 0),
      count: dieselLogs.length,
    },
  };
}
