import { prisma } from "../../../lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../../lib/errors";
import { Prisma } from "@prisma/client";

export async function previewSettlement(customerId: string, fromDate: Date, toDate: Date) {
  if (fromDate >= toDate) {
    throw new BadRequestError("From date must be before to date");
  }

  const pickups = await prisma.pickup.findMany({
    where: {
      customerId,
      status: "pending",
      pickupDate: { gte: fromDate, lt: toDate },
    },
    include: { product: true, rider: true },
    orderBy: { pickupDate: "asc" },
  });

  if (pickups.length === 0) {
    throw new BadRequestError("No unsettled pickups found for this customer in the selected date range");
  }

  const byProduct = new Map<string, { productName: string; totalKg: number; totalAmount: number; count: number }>();
  for (const pickup of pickups) {
    const entry = byProduct.get(pickup.productId) ?? { productName: pickup.product?.name ?? "Unknown", totalKg: 0, totalAmount: 0, count: 0 };
    entry.totalKg += Number(pickup.kg);
    entry.totalAmount += Number(pickup.amount);
    entry.count += 1;
    byProduct.set(pickup.productId, entry);
  }

  const totalKg = Number(pickups.reduce((sum, p) => sum + Number(p.kg), 0).toFixed(2));
  const totalAmount = Number(pickups.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2));

  const actualFrom = pickups[0].pickupDate;
  const actualTo = pickups[pickups.length - 1].pickupDate;

  return {
    customerId,
    fromDate: actualFrom,
    toDate: actualTo,
    pickupsCount: pickups.length,
    totalKg,
    totalAmount,
    lineItems: Array.from(byProduct.entries()).map(([productId, data]) => ({
      productId,
      productName: data.productName,
      totalKg: Number(data.totalKg.toFixed(2)),
      pricePerKg: data.totalKg > 0 ? Number((data.totalAmount / data.totalKg).toFixed(2)) : 0,
      amount: Number(data.totalAmount.toFixed(2)),
      count: data.count,
    })),
  };
}

export async function generateSettlement(
  customerId: string,
  fromDate: Date,
  toDate: Date,
  adminUserId: string
) {
  if (fromDate >= toDate) {
    throw new BadRequestError("From date must be before to date");
  }

  const pickups = await prisma.pickup.findMany({
    where: {
      customerId,
      status: "pending",
      pickupDate: { gte: fromDate, lt: toDate },
    },
  });

  if (pickups.length === 0) {
    throw new BadRequestError("No unsettled pickups found for this customer in the selected date range");
  }

  const actualFrom = pickups.reduce((min, p) => p.pickupDate < min ? p.pickupDate : min, pickups[0].pickupDate);
  const actualTo = new Date(pickups.reduce((max, p) => p.pickupDate > max ? p.pickupDate : max, pickups[0].pickupDate));
  actualTo.setDate(actualTo.getDate() + 1);

  const month = actualFrom.getMonth() + 1;
  const year = actualFrom.getFullYear();

  const byProduct = new Map<string, { totalKg: number; totalAmount: number }>();
  for (const pickup of pickups) {
    const entry = byProduct.get(pickup.productId) ?? { totalKg: 0, totalAmount: 0 };
    entry.totalKg += Number(pickup.kg);
    entry.totalAmount += Number(pickup.amount);
    byProduct.set(pickup.productId, entry);
  }

  const totalKg = Number(pickups.reduce((sum, p) => sum + Number(p.kg), 0).toFixed(2));
  const totalAmount = Number(pickups.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2));

  try {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          customerId,
          month,
          year,
          fromDate: actualFrom,
          toDate: actualTo,
          totalKg,
          totalAmount,
          createdById: adminUserId,
          lineItems: {
            create: Array.from(byProduct.entries()).map(([productId, { totalKg: kg, totalAmount: amt }]) => ({
              productId,
              totalKg: Number(kg.toFixed(2)),
              pricePerKg: Number((amt / kg).toFixed(2)),
              amount: Number(amt.toFixed(2)),
            })),
          },
        },
        include: { lineItems: { include: { product: true } }, customer: true },
      });

      await tx.pickup.updateMany({
        where: { id: { in: pickups.map((p) => p.id) } },
        data: { status: "included_in_settlement" },
      });

      return transaction;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("A settlement already exists for this customer and month/year");
    }
    throw err;
  }
}

export function listSettlements(filters?: {
  status?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
  productId?: string;
}) {
  const where: Prisma.TransactionWhereInput = {};

  if (filters?.status) {
    where.status = filters.status as "pending" | "paid";
  }
  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }
  if (filters?.fromDate || filters?.toDate) {
    where.AND = [];
    if (filters.fromDate) {
      (where.AND as Prisma.TransactionWhereInput[]).push({
        OR: [
          { fromDate: { gte: new Date(filters.fromDate) } },
          { AND: [{ fromDate: null }, { createdAt: { gte: new Date(filters.fromDate) } }] },
        ],
      });
    }
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setDate(toDate.getDate() + 1);
      (where.AND as Prisma.TransactionWhereInput[]).push({
        OR: [
          { toDate: { lt: toDate } },
          { AND: [{ toDate: null }, { createdAt: { lt: toDate } }] },
        ],
      });
    }
  }
  if (filters?.productId) {
    where.lineItems = { some: { productId: filters.productId } };
  }

  return prisma.transaction.findMany({
    where,
    include: { customer: true, lineItems: { include: { product: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function markSettlementPaid(id: string, paidDate: Date) {
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) {
    throw new NotFoundError("Settlement not found");
  }
  return prisma.transaction.update({
    where: { id },
    data: { status: "paid", paidDate },
  });
}

export async function getSettlementsSummary(filters?: {
  customerId?: string;
  productId?: string;
  cityId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const toDateEnd = filters?.toDate ? new Date(filters.toDate + "T23:59:59.999Z") : undefined;
  const fromDate = filters?.fromDate ? new Date(filters.fromDate) : undefined;

  const where: any = {};
  if (filters?.customerId) where.customerId = filters.customerId;
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.cityId) where.customer = { cityId: filters.cityId };
  if (fromDate || toDateEnd) {
    where.pickupDate = {};
    if (fromDate) where.pickupDate.gte = fromDate;
    if (toDateEnd) where.pickupDate.lte = toDateEnd;
  }

  const pickups = await prisma.pickup.findMany({
    where,
    include: { customer: true, product: true },
    orderBy: { pickupDate: "desc" },
  });

  const grouped = new Map<string, {
    customerId: string;
    customerName: string;
    totalPickups: number;
    totalKg: number;
    totalAmount: number;
    pendingCount: number;
    pendingKg: number;
    pendingAmount: number;
    paidCount: number;
    paidKg: number;
    paidAmount: number;
  }>();

  for (const p of pickups) {
    const key = p.customerId;
    const existing = grouped.get(key) ?? {
      customerId: p.customerId,
      customerName: p.customer?.name ?? "Unknown",
      totalPickups: 0,
      totalKg: 0,
      totalAmount: 0,
      pendingCount: 0,
      pendingKg: 0,
      pendingAmount: 0,
      paidCount: 0,
      paidKg: 0,
      paidAmount: 0,
    };
    existing.totalPickups += 1;
    existing.totalKg += Number(p.kg);
    existing.totalAmount += Number(p.amount);
    if (p.status === "pending") {
      existing.pendingCount += 1;
      existing.pendingKg += Number(p.kg);
      existing.pendingAmount += Number(p.amount);
    } else {
      existing.paidCount += 1;
      existing.paidKg += Number(p.kg);
      existing.paidAmount += Number(p.amount);
    }
    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => b.pendingAmount - a.pendingAmount);
}

export async function markCustomerSettlementPaid(customerId: string, fromDate: Date, toDate: Date) {
  const toDateEnd = new Date(toDate);
  toDateEnd.setUTCHours(23, 59, 59, 999);

  const result = await prisma.pickup.updateMany({
    where: {
      customerId,
      status: "pending",
      pickupDate: { gte: fromDate, lte: toDateEnd },
    },
    data: { status: "paid" },
  });

  return { updatedCount: result.count };
}
