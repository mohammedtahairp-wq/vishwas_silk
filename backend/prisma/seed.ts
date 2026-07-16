import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  await Promise.all(
    ["Kanchipuram", "Arni"].map((name) =>
      prisma.city.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const products = await Promise.all(
    [
      { name: "Jhilli", pricePerKg: 40 },
      { name: "Jhilli3", pricePerKg: 35 },
      { name: "Kada", pricePerKg: 25 },
    ].map(({ name }) =>
      prisma.product.upsert({
        where: { name },
        update: {},
        create: { name, unit: "kg", status: "active" },
      })
    )
  );

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: await hash("Admin@123"),
      role: "admin",
      status: "active",
    },
  });

  let rider = await prisma.rider.findUnique({ where: { phone: "9876500001" } });
  if (!rider) {
    rider = await prisma.rider.create({
      data: { name: "Ramesh Kumar", phone: "9876500001", status: "active" },
    });
  }
  await prisma.user.upsert({
    where: { username: "rider1" },
    update: {},
    create: {
      username: "rider1",
      passwordHash: await hash("Rider@123"),
      role: "rider",
      linkedId: rider.id,
      status: "active",
    },
  });

  const customerSeeds = [
    { name: "Suresh Traders", phone: "9876500002", address: "Main Bazaar Road", villageArea: "Kanchipuram", username: "customer1" },
    { name: "Lakshmi Silk House", phone: "9876500003", address: "Temple Street", villageArea: "Arni", username: "customer2" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    let customer = await prisma.customer.findUnique({ where: { phone: seed.phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: seed.name,
          phone: seed.phone,
          address: seed.address,
          villageArea: seed.villageArea,
          assignedRiderId: rider.id,
          createdById: admin.id,
        },
      });
    }
    await prisma.user.upsert({
      where: { username: seed.username },
      update: {},
      create: {
        username: seed.username,
        passwordHash: await hash("Customer@123"),
        role: "customer",
        linkedId: customer.id,
        status: "active",
      },
    });
    customers.push(customer);
  }

  const priceMap: Record<string, number> = { Jhilli: 40, Jhilli3: 35, Kada: 25 };
  const effectiveFrom = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  for (const product of products) {
    const globalPrice = await prisma.customerProductPrice.findFirst({
      where: { customerId: null, productId: product.id },
    });
    if (!globalPrice) {
      await prisma.customerProductPrice.create({
        data: {
          customerId: null,
          productId: product.id,
          pricePerKg: priceMap[product.name],
          effectiveFrom,
          createdById: admin.id,
        },
      });
    }
  }

  for (const customer of customers) {
    for (const product of products) {
      const existing = await prisma.customerProductPrice.findFirst({
        where: { customerId: customer.id, productId: product.id },
      });
      if (!existing) {
        await prisma.customerProductPrice.create({
          data: {
            customerId: customer.id,
            productId: product.id,
            pricePerKg: priceMap[product.name],
            effectiveFrom,
            createdById: admin.id,
          },
        });
      }
    }
  }

  const jhilli = products.find((p) => p.name === "Jhilli")!;
  const existingPickups = await prisma.pickup.count({ where: { customerId: customers[0].id } });
  if (existingPickups === 0) {
    const kg = 12.5;
    const pricePerKg = priceMap.Jhilli;
    await prisma.pickup.create({
      data: {
        customerId: customers[0].id,
        riderId: rider.id,
        productId: jhilli.id,
        kg,
        pricePerKgSnapshot: pricePerKg,
        amount: Number((kg * pricePerKg).toFixed(2)),
        pickupDate: new Date(),
      },
    });
  }

  console.log("Seed complete. Login credentials:");
  console.log("  admin     / Admin@123");
  console.log("  rider1    / Rider@123");
  console.log("  customer1 / Customer@123");
  console.log("  customer2 / Customer@123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
