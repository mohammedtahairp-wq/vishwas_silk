import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";
import * as pricingService from "../pricing/pricing.service";

interface PickupFilter {
  customerId?: string;
  riderId?: string;
  productId?: string;
  from?: Date;
  to?: Date;
}

export function listPickups(filter: PickupFilter) {
  return prisma.pickup.findMany({
    where: {
      customerId: filter.customerId,
      riderId: filter.riderId,
      productId: filter.productId,
      pickupDate:
        filter.from || filter.to
          ? { gte: filter.from, lte: filter.to }
          : undefined,
    },
    include: { customer: true, rider: true, product: true },
    orderBy: { pickupDate: "desc" },
  });
}

interface CreatePickupInput {
  customerId: string;
  riderId: string;
  productId: string;
  kg: number;
  pickupDate?: Date;
}

interface BatchPickupItem {
  productId: string;
  kg: number;
}

interface CreateBatchPickupsInput {
  customerId: string;
  riderId: string;
  items: BatchPickupItem[];
  pickupDate?: Date;
}

export async function createPickup(input: CreatePickupInput) {
  const price = await pricingService.currentPriceFor(input.customerId, input.productId, input.pickupDate);
  if (!price) {
    throw new NotFoundError("No price set for this customer and product — ask admin to set a price/kg first");
  }

  const pricePerKgSnapshot = Number(price.pricePerKg);
  const amount = Number((input.kg * pricePerKgSnapshot).toFixed(2));

  return prisma.pickup.create({
    data: {
      customerId: input.customerId,
      riderId: input.riderId,
      productId: input.productId,
      kg: input.kg,
      pickupDate: input.pickupDate ?? new Date(),
      pricePerKgSnapshot,
      amount,
    },
  });
}

export async function createBatchPickups(input: CreateBatchPickupsInput) {
  const pickupDate = input.pickupDate ?? new Date();

  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of input.items) {
      const price = await pricingService.currentPriceFor(input.customerId, item.productId, pickupDate);
      if (!price) {
        throw new NotFoundError(`No price set for product ${item.productId} — ask admin to set a price/kg first`);
      }

      const pricePerKgSnapshot = Number(price.pricePerKg);
      const amount = Number((item.kg * pricePerKgSnapshot).toFixed(2));

      const pickup = await tx.pickup.create({
        data: {
          customerId: input.customerId,
          riderId: input.riderId,
          productId: item.productId,
          kg: item.kg,
          pickupDate,
          pricePerKgSnapshot,
          amount,
        },
      });
      created.push(pickup);
    }
    return created;
  });
}

export async function priceAvailable(customerId: string, productId: string) {
  return Boolean(await pricingService.currentPriceFor(customerId, productId));
}
