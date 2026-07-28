import { prisma } from "../../../lib/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../../lib/errors";

interface CreateCustomerInput {
  name: string;
  phone: string;
  address: string;
  villageArea?: string;
  createdById: string;
}

interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  villageArea?: string;
}

interface ListCustomersFilter {
  riderId?: string;
  status?: "active" | "inactive";
  search?: string;
}

async function generateSerialNumber(city?: string | null): Promise<string> {
  const prefix = (city || "UNASSIGNED").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12);
  const count = await prisma.customer.count({
    where: { villageArea: city || null },
  });
  const next = count + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export async function createCustomer(input: CreateCustomerInput) {
  const serialNumber = await generateSerialNumber(input.villageArea);
  return prisma.customer.create({
    data: {
      serialNumber,
      name: input.name,
      phone: input.phone,
      address: input.address,
      villageArea: input.villageArea,
      createdById: input.createdById,
    },
  });
}

export function listCustomers(filter: ListCustomersFilter) {
  return prisma.customer.findMany({
    where: {
      assignedRiderId: filter.riderId,
      status: filter.status,
      ...(filter.search
        ? {
            OR: [
              { serialNumber: { contains: filter.search, mode: "insensitive" } },
              { name: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search } },
            ],
          }
        : {}),
    },
    include: { assignedRider: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { assignedRider: true },
  });
  if (!customer) {
    throw new NotFoundError("Customer not found");
  }
  return customer;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomerById(id);
  return prisma.customer.update({ where: { id }, data: input });
}

export async function deleteCustomer(id: string) {
  await getCustomerById(id);
  const [pickups, transactions] = await Promise.all([
    prisma.pickup.count({ where: { customerId: id } }),
    prisma.transaction.count({ where: { customerId: id } }),
  ]);
  if (pickups > 0 || transactions > 0) {
    throw new ConflictError(
      "Cannot delete a customer with recorded pickups or settlements. Deactivate the customer instead."
    );
  }
  // No pickups/transactions: safe to remove, but clear any price rows first.
  await prisma.customerProductPrice.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
}

export async function assignRider(id: string, riderId: string | null) {
  await getCustomerById(id);
  if (riderId) {
    const rider = await prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundError("Rider not found");
    if (rider.status !== "active") throw new ConflictError("Cannot assign an inactive rider");
  }
  return prisma.customer.update({ where: { id }, data: { assignedRiderId: riderId } });
}

export async function setCustomerStatus(id: string, status: "active" | "inactive") {
  await getCustomerById(id);
  return prisma.customer.update({ where: { id }, data: { status } });
}

/**
 * Ownership guard for rider-role actions on a customer (e.g. logging a
 * pickup). Throws if the customer isn't assigned to this rider, or doesn't
 * exist — a rider must never be able to act on or discover another rider's
 * customers by guessing an id.
 */
export async function assertCustomerBelongsToRider(customerId: string, riderId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.assignedRiderId !== riderId) {
    throw new ForbiddenError("This customer is not assigned to you");
  }
  return customer;
}
