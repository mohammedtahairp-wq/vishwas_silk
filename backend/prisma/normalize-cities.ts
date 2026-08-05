import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Known wrong/duplicate entries in the managed cities table, mapped to the
// canonical spelling actually used by customers (ground truth in village_area).
const CANONICAL: Record<string, string> = {
  HINIGNAL: "Hinignal",
  KAYANLUR: "Kalynur",
  "KOLAR 1": "Kolar",
  "KOLAR 2": "Kolar",
  KUPPAM: "Kuppam",
  OTHERS: "Others",
  PALAMNER: "Palamner",
};

async function main() {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  console.log("Existing cities:", cities.map((c) => c.name).join(", "));

  const customerCities = await prisma.customer.findMany({
    where: { villageArea: { not: null } },
    select: { villageArea: true },
  });
  const riderCities = await prisma.rider.findMany({
    where: { villageArea: { not: null } },
    select: { villageArea: true },
  });
  const used = new Set<string>();
  for (const c of [...customerCities, ...riderCities]) {
    const name = (c.villageArea ?? "").trim();
    if (name) used.add(name);
  }
  console.log("Cities used by customers/riders:", [...used].sort().join(", "));

  const counts = new Map<string, number>();
  for (const city of cities) {
    const canonical = CANONICAL[city.name] ?? city.name;
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const extraIds = cities.filter((city) => {
    const canonical = CANONICAL[city.name] ?? city.name;
    if (seen.has(canonical)) return true;
    seen.add(canonical);
    return false;
  }).map((city) => city.id);

  if (extraIds.length > 0) {
    await prisma.city.deleteMany({ where: { id: { in: extraIds } } });
    console.log(`Deleted duplicate city rows (${extraIds.length}).`);
  }

  for (const [oldName, canonical] of Object.entries(CANONICAL)) {
    const existing = await prisma.city.findFirst({ where: { name: canonical } });
    if (existing) continue;
    const row = await prisma.city.findFirst({ where: { name: oldName } });
    if (row) {
      await prisma.city.update({ where: { id: row.id }, data: { name: canonical } });
      console.log(`Renamed "${oldName}" -> "${canonical}".`);
    }
  }

  for (const name of used) {
    const existing = await prisma.city.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!existing) {
      await prisma.city.create({ data: { name } });
      console.log(`Created missing city "${name}".`);
    }
  }

  const final = await prisma.city.findMany({ orderBy: { name: "asc" } });
  console.log("Final cities:", final.map((c) => c.name).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
