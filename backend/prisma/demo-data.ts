import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FROM = new Date(Date.UTC(2026, 6, 1));
const TO = new Date(Date.UTC(2026, 6, 16));

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function deterministicKg(customerIndex: number, day: number, productIndex: number) {
  return Number((8 + ((customerIndex * 7 + day * 3 + productIndex * 5) % 25) + ((customerIndex + day) % 5) * 0.2).toFixed(2));
}

async function main() {
  const [customers, products, riders, prices, existingPickups] = await Promise.all([
    prisma.customer.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" } }),
    prisma.rider.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" } }),
    prisma.customerProductPrice.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.pickup.findMany({
      where: { pickupDate: { gte: FROM, lte: TO } },
      select: { customerId: true, productId: true, pickupDate: true },
    }),
  ]);

  if (customers.length === 0 || products.length === 0 || riders.length === 0) {
    throw new Error("Demo data requires at least one active customer, product, and rider.");
  }

  const existing = new Set(
    existingPickups.map((pickup) => `${pickup.customerId}:${pickup.productId}:${dateKey(pickup.pickupDate)}`),
  );

  const priceFor = (customerId: string, productId: string, date: Date) => {
    const customerPrice = prices.find(
      (price) =>
        price.customerId === customerId &&
        price.productId === productId &&
        price.effectiveFrom <= date,
    );
    const globalPrice = prices.find(
      (price) =>
        price.customerId == null &&
        price.productId === productId &&
        price.effectiveFrom <= date,
    );
    return Number(customerPrice?.pricePerKg ?? globalPrice?.pricePerKg ?? 10);
  };

  const rows = [];
  for (let date = new Date(FROM); date <= TO; date.setUTCDate(date.getUTCDate() + 1)) {
    const pickupDate = new Date(date);
    const day = pickupDate.getUTCDate();

    for (let customerIndex = 0; customerIndex < customers.length; customerIndex++) {
      const customer = customers[customerIndex];
      const riderId = customer.assignedRiderId ?? riders[customerIndex % riders.length].id;
      const productsForDay = [
        products[(customerIndex + day) % products.length],
        products[(customerIndex + day + 1) % products.length],
      ].filter((product, index, selected) => selected.findIndex((item) => item.id === product.id) === index);

      for (const product of productsForDay) {
        const key = `${customer.id}:${product.id}:${dateKey(pickupDate)}`;
        if (existing.has(key)) continue;

        const productIndex = products.findIndex((item) => item.id === product.id);
        const kg = deterministicKg(customerIndex, day, productIndex);
        const pricePerKgSnapshot = priceFor(customer.id, product.id, pickupDate);
        rows.push({
          customerId: customer.id,
          riderId,
          productId: product.id,
          kg,
          pickupDate,
          pricePerKgSnapshot,
          amount: Number((kg * pricePerKgSnapshot).toFixed(2)),
        });
        existing.add(key);
      }
    }
  }

  const result = rows.length > 0
    ? await prisma.pickup.createMany({ data: rows })
    : { count: 0 };

  console.log(`Demo data complete: ${result.count} pickups added for ${customers.length} customers.`);
  console.log(`Period: ${dateKey(FROM)} to ${dateKey(TO)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
