import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sources = [
  { city: "Kolar", file: "sheet-Kolar.csv" },
  { city: "Kiyanlur", file: "sheet-Kiyanlur.csv" },
  { city: "Hinignal", file: "sheet-Hinignal.csv" },
  { city: "Palamner", file: "sheet-Palamner.csv" },
  { city: "Kuppam", file: "sheet-Kuppam.csv" },
  { city: "Others", file: "sheet-Others.csv" },
];

function parseCsv(text: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += char;
  }
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  const headers = records.shift()?.map((header) => header.trim()) ?? [];
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function numberValue(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function reportDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = months.indexOf(match[2].toLowerCase());
  if (month < 0) return null;
  const shortYear = Number(match[3]);
  const year = shortYear < 100 ? 2000 + shortYear : shortYear;
  return new Date(Date.UTC(year, month, Number(match[1])));
}

function syntheticPhone(city: string, customer: string) {
  return `GS-${createHash("sha1").update(`${city}|${customer.toUpperCase()}`).digest("hex").slice(0, 14)}`;
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "admin" } });
  const rider = await prisma.rider.findFirstOrThrow({ where: { status: "active" } });
  const oldImported = await prisma.customer.findMany({ where: { phone: { startsWith: "GS-" } }, select: { id: true } });
  const oldIds = oldImported.map((customer) => customer.id);
  if (oldIds.length) {
    await prisma.pickup.deleteMany({ where: { customerId: { in: oldIds } } });
    await prisma.customerProductPrice.deleteMany({ where: { customerId: { in: oldIds } } });
  }

  const productCache = new Map<string, { id: string; name: string }>();
  const customerCache = new Map<string, { id: string }>();
  const priceRows = new Map<string, { customerId: string; productId: string; rate: number; date: Date }>();
  const pickupRows: Array<{
    customerId: string;
    riderId: string;
    productId: string;
    kg: number;
    pickupDate: Date;
    pricePerKgSnapshot: number;
    amount: number;
  }> = [];
  let sourceRows = 0;

  for (const source of sources) {
    await prisma.city.upsert({ where: { name: source.city }, update: {}, create: { name: source.city } });
    const rows = parseCsv(readFileSync(join(__dirname, source.file), "utf8"));
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]);
    const customerHeader = headers.find((header) => /^customer/i.test(header));
    if (!customerHeader) throw new Error(`Customer column not found in ${source.file}`);
    const productHeaders = headers.filter((header) => {
      if (/^(timestamp|date|customer)/i.test(header) || / amount$/i.test(header)) return false;
      return headers.some((other) => cleanName(other).toLowerCase() === `${cleanName(header).toLowerCase()} amount`);
    });

    for (const raw of rows) {
      const customerName = cleanName(raw[customerHeader] ?? "");
      const date = reportDate(raw.Date ?? "");
      if (!customerName || !date) continue;
      sourceRows++;

      const customerKey = `${source.city}|${customerName.toUpperCase()}`;
      let customer = customerCache.get(customerKey);
      if (!customer) {
        customer = await prisma.customer.upsert({
          where: { phone: syntheticPhone(source.city, customerName) },
          update: {
            name: customerName,
            villageArea: source.city,
            assignedRiderId: rider.id,
            status: "active",
          },
          create: {
            name: customerName,
            phone: syntheticPhone(source.city, customerName),
            address: `${source.city} report import`,
            villageArea: source.city,
            assignedRiderId: rider.id,
            createdById: admin.id,
          },
          select: { id: true },
        });
        customerCache.set(customerKey, customer);
      }

      for (const rawProductHeader of productHeaders) {
        const productName = cleanName(rawProductHeader);
        const kg = numberValue(raw[rawProductHeader]);
        if (kg <= 0) continue;
        const amountHeader = headers.find((header) => cleanName(header).toLowerCase() === `${productName.toLowerCase()} amount`);
        const amount = numberValue(amountHeader ? raw[amountHeader] : undefined);
        let product = productCache.get(productName.toLowerCase());
        if (!product) {
          product = await prisma.product.upsert({
            where: { name: productName },
            update: { status: "active" },
            create: { name: productName, unit: "kg", status: "active" },
            select: { id: true, name: true },
          });
          productCache.set(productName.toLowerCase(), product);
        }
        const rate = amount > 0 ? amount / kg : 0;
        pickupRows.push({
          customerId: customer.id,
          riderId: rider.id,
          productId: product.id,
          kg,
          pickupDate: date,
          pricePerKgSnapshot: rate,
          amount,
        });
        if (rate > 0) {
          const key = `${customer.id}|${product.id}`;
          const current = priceRows.get(key);
          if (!current || date < current.date) priceRows.set(key, { customerId: customer.id, productId: product.id, rate, date });
        }
      }
    }
  }

  for (const price of priceRows.values()) {
    await prisma.customerProductPrice.create({
      data: {
        customerId: price.customerId,
        productId: price.productId,
        pricePerKg: price.rate,
        effectiveFrom: price.date,
        createdById: admin.id,
      },
    });
  }
  for (let index = 0; index < pickupRows.length; index += 500) {
    await prisma.pickup.createMany({ data: pickupRows.slice(index, index + 500) });
  }

  console.log(`Imported ${sourceRows} dated report rows.`);
  console.log(`Created/updated ${customerCache.size} city-specific customers and ${productCache.size} products.`);
  console.log(`Created ${pickupRows.length} non-zero pickup entries across ${sources.length} cities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
