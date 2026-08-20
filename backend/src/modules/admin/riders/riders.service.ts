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
  loginPhone?: string;
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

export async function listRiders() {
  const riders = await prisma.rider.findMany({ orderBy: { createdAt: "desc" } });
  const users = await prisma.user.findMany({ where: { role: "rider" }, select: { linkedId: true, loginPhone: true } });
  const loginMap = new Map(users.map((u) => [u.linkedId, u.loginPhone]));
  return riders.map((r) => ({ ...r, loginPhone: loginMap.get(r.id) ?? null }));
}

export async function getRiderById(id: string) {
  const rider = await prisma.rider.findUnique({ where: { id } });
  if (!rider) {
    throw new NotFoundError("Rider not found");
  }
  const user = await prisma.user.findFirst({ where: { linkedId: id, role: "rider" }, select: { loginPhone: true } });
  return { ...rider, loginPhone: user?.loginPhone ?? null };
}

export async function updateRider(id: string, input: UpdateRiderInput) {
  await getRiderById(id);
  return prisma.$transaction(async (tx) => {
    const rider = await tx.rider.update({ where: { id }, data: input });
    if (input.status || input.loginPhone) {
      const userData: { status?: "active" | "inactive"; loginPhone?: string } = {};
      if (input.status) userData.status = input.status;
      if (input.loginPhone) {
        const trimmed = input.loginPhone.trim();
        const existing = await tx.user.findUnique({ where: { loginPhone: trimmed } });
        if (existing && existing.linkedId !== id) {
          throw new ConflictError("That phone number is already in use for login");
        }
        userData.loginPhone = trimmed;
      }
      await tx.user.updateMany({ where: { linkedId: id, role: "rider" }, data: userData });
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
