import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";

interface CreateRiderInput {
  name: string;
  phone: string;
  villageArea?: string;
  loginPhone: string;
}

interface UpdateRiderInput {
  name?: string;
  phone?: string;
  villageArea?: string;
  status?: "active" | "inactive";
}

export async function createRider(input: CreateRiderInput) {
  const loginPhone = input.loginPhone.trim();
  const existingUser = await prisma.user.findUnique({ where: { loginPhone } });
  if (existingUser) throw new ConflictError("That phone number is already in use for login");

  return prisma.$transaction(async (tx) => {
    const rider = await tx.rider.create({
      data: { name: input.name, phone: input.phone, villageArea: input.villageArea },
    });
    await tx.user.create({
      data: { loginPhone, role: "rider", linkedId: rider.id },
    });
    return { rider, loginPhone };
  });
}

export function listRiders() {
  return prisma.rider.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getRiderById(id: string) {
  const rider = await prisma.rider.findUnique({ where: { id } });
  if (!rider) {
    throw new NotFoundError("Rider not found");
  }
  return rider;
}

export async function updateRider(id: string, input: UpdateRiderInput) {
  await getRiderById(id);
  return prisma.$transaction(async (tx) => {
    const rider = await tx.rider.update({ where: { id }, data: input });
    if (input.status) {
      await tx.user.updateMany({ where: { linkedId: id, role: "rider" }, data: { status: input.status } });
    }
    return rider;
  });
}

export async function deleteRider(id: string) {
  await getRiderById(id);
  const [customers, pickups] = await Promise.all([
    prisma.customer.count({ where: { assignedRiderId: id } }),
    prisma.pickup.count({ where: { riderId: id } }),
  ]);
  if (customers > 0 || pickups > 0) {
    throw new ConflictError(
      "Cannot delete a rider with assigned customers or recorded pickups. Reassign customers and deactivate the rider instead."
    );
  }
  await prisma.$transaction([
    prisma.user.deleteMany({ where: { linkedId: id, role: "rider" } }),
    prisma.rider.delete({ where: { id } }),
  ]);
}

export async function getRiderCustomers(id: string) {
  await getRiderById(id);
  return prisma.customer.findMany({ where: { assignedRiderId: id }, orderBy: { createdAt: "desc" } });
}
