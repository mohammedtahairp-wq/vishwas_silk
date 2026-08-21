import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";
import { normalizeLoginPhone } from "../../../lib/phone";

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
  const loginPhone = normalizeLoginPhone(input.loginPhone);
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
  const current = await getRiderById(id);

  // When the contact phone changed and no explicit loginPhone was sent,
  // the rider's login follows the new phone so they can sign in immediately.
  let desiredLoginPhone: string | undefined;
  if (typeof input.loginPhone === "string" && input.loginPhone.trim()) {
    desiredLoginPhone = normalizeLoginPhone(input.loginPhone);
  } else if (input.phone && input.phone !== current.phone) {
    desiredLoginPhone = normalizeLoginPhone(input.phone);
  }

  const { loginPhone: _ignored, ...riderFields } = input;

  return prisma.$transaction(async (tx) => {
    const rider = await tx.rider.update({ where: { id }, data: riderFields });
    if (input.status || desiredLoginPhone) {
      const userData: { status?: "active" | "inactive"; loginPhone?: string } = {};
      if (input.status) userData.status = input.status;
      if (desiredLoginPhone) {
        const existing = await tx.user.findUnique({ where: { loginPhone: desiredLoginPhone } });
        if (existing && existing.linkedId !== id) {
          throw new ConflictError("That phone number is already in use for login");
        }
        userData.loginPhone = desiredLoginPhone;
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
