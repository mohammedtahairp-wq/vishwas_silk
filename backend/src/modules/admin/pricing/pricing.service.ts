import { prisma } from "../../../lib/prisma";

interface SetPriceInput {
  customerId: string | null;
  productId: string;
  pricePerKg: number;
  effectiveFrom: Date;
  createdById: string;
}

export function setPrice(input: SetPriceInput) {
  return prisma.customerProductPrice.create({
    data: {
      customerId: input.customerId,
      productId: input.productId,
      pricePerKg: input.pricePerKg,
      effectiveFrom: input.effectiveFrom,
      createdById: input.createdById,
    },
  });
}

export function priceHistory(customerId: string | null) {
  return prisma.customerProductPrice.findMany({
    where: { customerId },
    include: { product: true },
    orderBy: [{ productId: "asc" }, { effectiveFrom: "desc" }],
  });
}

/**
 * Single source of truth for "current price": the most recent price row
 * whose effective_from is on or before asOfDate. Called by both the pickup
 * creation flow and any admin "current price" display — do not duplicate.
 */
export async function currentPriceFor(customerId: string, productId: string, asOfDate: Date = new Date()) {
  const customerPrice = await prisma.customerProductPrice.findFirst({
    where: { customerId, productId, effectiveFrom: { lte: asOfDate } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (customerPrice) return customerPrice;
  return prisma.customerProductPrice.findFirst({
    where: { customerId: null, productId, effectiveFrom: { lte: asOfDate } },
    orderBy: { effectiveFrom: "desc" },
  });
}
