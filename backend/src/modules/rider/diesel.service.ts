import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import type { Unit } from "@prisma/client";

export interface CreateDieselLogInput {
  vehicleId: string;
  riderId: string;
  dieselDate: Date;
  dieselAmount: number;
  startKm: number;
  endKm: number;
  createdById: string;
}

export interface UpdateDieselLogInput {
  vehicleId?: string;
  dieselDate?: Date;
  dieselAmount?: number;
  startKm?: number;
  endKm?: number;
}

function computeKmRun(startKm: number, endKm: number): number {
  if (endKm < startKm) {
    throw new BadRequestError("End KM cannot be less than start KM");
  }
  return endKm - startKm;
}

export async function listActiveVehicles() {
  return prisma.vehicle.findMany({
    where: { status: "active" },
    orderBy: [{ name: "asc" }],
  });
}

export async function createDieselLog(input: CreateDieselLogInput) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  if (vehicle.status !== "active") {
    throw new BadRequestError("Diesel can only be logged for an active vehicle");
  }

  const kmRun = computeKmRun(input.startKm, input.endKm);

  return prisma.dieselLog.create({
    data: {
      vehicleId: input.vehicleId,
      riderId: input.riderId,
      unit: vehicle.unit as Unit,
      dieselDate: input.dieselDate,
      dieselAmount: input.dieselAmount,
      startKm: input.startKm,
      endKm: input.endKm,
      kmRun,
      createdById: input.createdById,
    },
    include: { vehicle: { select: { name: true, number: true } } },
  });
}

export async function listDieselLogs(
  riderId: string,
  filters: { from?: Date; to?: Date } = {}
) {
  return prisma.dieselLog.findMany({
    where: {
      riderId,
      dieselDate: filters.from || filters.to
        ? { gte: filters.from, lte: filters.to }
        : undefined,
    },
    include: { vehicle: { select: { name: true, number: true } } },
    orderBy: [{ dieselDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function updateOwnDieselLog(id: string, riderId: string, input: UpdateDieselLogInput) {
  const existing = await prisma.dieselLog.findUnique({ where: { id } });
  if (!existing || existing.riderId !== riderId) {
    throw new NotFoundError("Diesel log not found");
  }

  const vehicleId = input.vehicleId ?? existing.vehicleId;
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new NotFoundError("Vehicle not found");

  const startKm = input.startKm ?? Number(existing.startKm);
  const endKm = input.endKm ?? Number(existing.endKm);
  const kmRun = computeKmRun(startKm, endKm);

  return prisma.dieselLog.update({
    where: { id },
    data: {
      vehicleId,
      unit: vehicle.unit as Unit,
      dieselDate: input.dieselDate ?? existing.dieselDate,
      dieselAmount: input.dieselAmount ?? existing.dieselAmount,
      startKm,
      endKm,
      kmRun,
    },
    include: { vehicle: { select: { name: true, number: true } } },
  });
}

export async function deleteOwnDieselLog(id: string, riderId: string) {
  const existing = await prisma.dieselLog.findUnique({ where: { id } });
  if (!existing || existing.riderId !== riderId) {
    throw new NotFoundError("Diesel log not found");
  }
  await prisma.dieselLog.delete({ where: { id } });
}
