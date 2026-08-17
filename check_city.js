const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const cities = await p.city.findMany();
  console.log("CITIES:", JSON.stringify(cities));
  const customers = await p.customer.findMany({ select: { id: true, name: true, cityId: true, villageArea: true } });
  console.log("CUSTOMERS:", JSON.stringify(customers));
  await p.$disconnect();
})();
