import { prisma } from "../../../lib/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../../lib/errors";
import { Prisma } from "@prisma/client";

export async function generateSettlement(customerId: string, month: number, year: number, adminUserId: string) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const pickups = await prisma.pickup.findMany({
    where: {
      customerId,
      status: "pending",
      pickupDate: { gte: from, lt: to },
    },
  });

  if (pickups.length === 0) {
    throw new BadRequestError("No unsettled pickups found for this customer in that month/year");
  }

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
          totalKg,
          totalAmount,
          createdById: adminUserId,
          lineItems: {
            create: Array.from(byProduct.entries()).map(([productId, { totalKg: kg, totalAmount: amt }]) => ({
              productId,
              totalKg: Number(kg.toFixed(2)),
              // Weighted-average price so the line item stays internally
              // consistent even if price changed mid-month.
              pricePerKg: Number((amt / kg).toFixed(2)),
              amount: Number(amt.toFixed(2)),
            })),
          },
        },
        include: { lineItems: true },
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

export function listSettlements() {
  return prisma.transaction.findMany({
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
