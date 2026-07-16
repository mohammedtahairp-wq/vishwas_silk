import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";

export function createCity(name: string) {
  return prisma.city.create({ data: { name: name.trim() } });
}

export function listCities() {
  return prisma.city.findMany({ orderBy: { name: "asc" } });
}

export async function updateCity(id: string, name: string) {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    throw new NotFoundError("City not found");
  }
  return prisma.city.update({ where: { id }, data: { name: name.trim() } });
}

export async function deleteCity(id: string) {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    throw new NotFoundError("City not found");
  }
  await prisma.city.delete({ where: { id } });
}
