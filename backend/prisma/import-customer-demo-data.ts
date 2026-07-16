import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Quantities = [number, number, number, number];

const rows: Array<{ name: string; quantities: Quantities; amounts: Quantities }> = [
  { name: "MUKHTIYAR", quantities: [30, 0, 0, 0], amounts: [180, 0, 0, 0] },
  { name: "ANISUR RAHMAN", quantities: [36, 3, 0, 0], amounts: [216, 105, 0, 0] },
  { name: "K H SILK", quantities: [0, 5, 0, 0], amounts: [0, 175, 0, 0] },
  { name: "K H SILK 2", quantities: [0, 4, 0, 0], amounts: [0, 140, 0, 0] },
  { name: "ZABI", quantities: [11, 0, 0, 0], amounts: [66, 0, 0, 0] },
  { name: "WAHEED PASHA", quantities: [0, 0, 52.6, 0], amounts: [0, 0, 946.8, 0] },
  { name: "FIROZ", quantities: [0, 6, 0, 0], amounts: [0, 210, 0, 0] },
  { name: "BABA MLA", quantities: [0, 7, 0, 0], amounts: [0, 245, 0, 0] },
  { name: "TAJPEER", quantities: [0, 6, 0, 0], amounts: [0, 210, 0, 0] },
  { name: "ASLAM", quantities: [0, 7, 0, 0], amounts: [0, 245, 0, 0] },
  { name: "SAJJAD", quantities: [0, 19, 0, 0], amounts: [0, 665, 0, 0] },
  { name: "BABU CHACHA", quantities: [0, 13, 39, 0], amounts: [0, 520, 702, 0] },
  { name: "WASEEM", quantities: [0, 0, 61, 0], amounts: [0, 0, 1098, 0] },
  { name: "SHAHEED NGR", quantities: [38, 0, 0, 40], amounts: [228, 0, 0, 0] },
  { name: "HANEEF", quantities: [0, 3, 0, 0], amounts: [0, 105, 0, 0] },
  { name: "EJAZ PASHA", quantities: [35, 1, 0, 0], amounts: [210, 35, 0, 0] },
  { name: "ASGAR", quantities: [44, 0, 0, 0], amounts: [264, 0, 0, 0] },
  { name: "D S IMTIYAZ", quantities: [67, 0, 0, 0], amounts: [938, 0, 0, 0] },
  { name: "ZAHEER PASHA", quantities: [24, 18, 0, 0], amounts: [144, 630, 0, 0] },
  { name: "ABBAS PASHA", quantities: [0, 8, 0, 0], amounts: [0, 280, 0, 0] },
  { name: "MAHBOOB", quantities: [3, 0, 0, 0], amounts: [18, 0, 0, 0] },
  { name: "BABA 3", quantities: [0, 10, 0, 0], amounts: [0, 350, 0, 0] },
  { name: "NAYAZ", quantities: [15, 0, 0, 0], amounts: [90, 0, 0, 0] },
  { name: "MOULA CHA", quantities: [55, 0, 0, 0], amounts: [330, 0, 0, 0] },
  { name: "ASHRAF ALI", quantities: [0, 35, 0, 0], amounts: [0, 1225, 0, 0] },
  { name: "SADIQ AZD NGR", quantities: [15, 0, 0, 40], amounts: [90, 0, 0, 800] },
  { name: "SABIR", quantities: [0, 2, 0, 0], amounts: [0, 70, 0, 0] },
];

const productNames = ["Keeda", "Jhilli", "Jhilli 3", "Jala"] as const;
const defaultRates = [6, 35, 18, 20];
const cityNames = ["Kanchipuram", "Arni", "Ramanagara", "Mysuru"];

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

async function main() {
  const now = new Date();
  const today = utcDate(now.getFullYear(), now.getMonth(), now.getDate());
  const historyStart = new Date(today);
  historyStart.setUTCMonth(historyStart.getUTCMonth() - 1);

  await Promise.all(cityNames.map((name) => prisma.city.upsert({ where: { name }, update: {}, create: { name } })));
  const products = await Promise.all(
    productNames.map((name) => prisma.product.upsert({
      where: { name },
      update: { status: "active" },
      create: { name, unit: "kg", status: "active" },
    }))
  );

  const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
  const rider = await prisma.rider.findFirstOrThrow({ where: { status: "active" } });
  const customers = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const phone = `910000${String(index + 1).padStart(4, "0")}`;
    const city = cityNames[index % cityNames.length];
    const customer = await prisma.customer.upsert({
      where: { phone },
      update: { name: row.name, villageArea: city, assignedRiderId: rider.id, status: "active" },
      create: {
        name: row.name,
        phone,
        address: `${city} Silk Market`,
        villageArea: city,
        assignedRiderId: rider.id,
        createdById: admin.id,
      },
    });
    customers.push(customer);

    for (let productIndex = 0; productIndex < products.length; productIndex++) {
      const kg = row.quantities[productIndex];
      const exactRate = kg > 0 && row.amounts[productIndex] > 0
        ? row.amounts[productIndex] / kg
        : defaultRates[productIndex];
      const existingPrice = await prisma.customerProductPrice.findFirst({
        where: { customerId: customer.id, productId: products[productIndex].id, effectiveFrom: historyStart },
      });
      if (!existingPrice) {
        await prisma.customerProductPrice.create({
          data: {
            customerId: customer.id,
            productId: products[productIndex].id,
            pricePerKg: exactRate,
            effectiveFrom: historyStart,
            createdById: admin.id,
          },
        });
      }
    }
  }

  const customerIds = customers.map((customer) => customer.id);
  await prisma.pickup.deleteMany({
    where: { customerId: { in: customerIds }, pickupDate: { gte: historyStart, lte: today } },
  });

  const pickups = [];
  for (let customerIndex = 0; customerIndex < customers.length; customerIndex++) {
    const customer = customers[customerIndex];
    const row = rows[customerIndex];

    for (let productIndex = 0; productIndex < products.length; productIndex++) {
      const kg = row.quantities[productIndex];
      if (kg <= 0) continue;
      const amount = row.amounts[productIndex];
      const rate = amount > 0 ? amount / kg : defaultRates[productIndex];
      pickups.push({
        customerId: customer.id,
        riderId: rider.id,
        productId: products[productIndex].id,
        kg,
        pricePerKgSnapshot: rate,
        amount,
        pickupDate: today,
      });
    }

    for (let daysAgo = 3 + (customerIndex % 3); daysAgo <= 30; daysAgo += 4 + (customerIndex % 2)) {
      const pickupDate = new Date(today);
      pickupDate.setUTCDate(today.getUTCDate() - daysAgo);
      for (let productIndex = 0; productIndex < products.length; productIndex++) {
        const baseKg = row.quantities[productIndex];
        if (baseKg <= 0 || (customerIndex + productIndex + daysAgo) % 4 === 0) continue;
        const factor = 0.65 + ((customerIndex * 7 + daysAgo) % 8) / 20;
        const kg = Number((baseKg * factor).toFixed(2));
        const todayAmount = row.amounts[productIndex];
        const rate = todayAmount > 0 ? todayAmount / baseKg : defaultRates[productIndex];
        pickups.push({
          customerId: customer.id,
          riderId: rider.id,
          productId: products[productIndex].id,
          kg,
          pricePerKgSnapshot: rate,
          amount: Number((kg * rate).toFixed(2)),
          pickupDate,
        });
      }
    }
  }

  await prisma.pickup.createMany({ data: pickups });
  console.log(`Imported ${customers.length} customers across ${cityNames.length} cities.`);
  console.log(`Created ${pickups.length} pickups from ${historyStart.toISOString().slice(0, 10)} through ${today.toISOString().slice(0, 10)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
