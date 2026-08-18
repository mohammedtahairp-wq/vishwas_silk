import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    where: { loginPhone: "9999900000" },
    update: {},
    create: {
      loginPhone: "9999900000",
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
    where: { loginPhone: "9876500001" },
    update: {},
    create: {
      loginPhone: "9876500001",
      role: "rider",
      linkedId: rider.id,
      status: "active",
    },
  });

  const customerSeeds = [
    { name: "Suresh Traders", phone: "9876500002", address: "Main Bazaar Road", villageArea: "Kanchipuram", loginPhone: "9876500002", serialNumber: "KANCHIPURAM01" },
    { name: "Lakshmi Silk House", phone: "9876500003", address: "Temple Street", villageArea: "Arni", loginPhone: "9876500003", serialNumber: "ARNI01" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    let customer = await prisma.customer.findUnique({ where: { phone: seed.phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          serialNumber: seed.serialNumber,
          name: seed.name,
          phone: seed.phone,
          address: seed.address,
          villageArea: seed.villageArea,
          assignedRiderId: rider.id,
          createdById: admin.id,
        },
      });
    } else if (!customer.serialNumber) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { serialNumber: seed.serialNumber },
      });
    }
    await prisma.user.upsert({
      where: { loginPhone: seed.loginPhone },
      update: {},
      create: {
        loginPhone: seed.loginPhone,
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

  console.log("Seed complete. Login phone numbers:");
  console.log("  admin     / 9999900000");
  console.log("  rider1    / 9876500001");
  console.log("  customer1 / 9876500002");
  console.log("  customer2 / 9876500003");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
