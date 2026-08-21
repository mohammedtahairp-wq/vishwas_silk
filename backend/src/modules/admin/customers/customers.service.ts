import { prisma } from "../../../lib/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../../lib/errors";
import { normalizeLoginPhone } from "../../../lib/phone";

interface ProductPriceInput {
  productId: string;
  pricePerKg: number;
  effectiveFrom?: string;
}

interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  villageArea?: string;
  createdById: string;
  loginPhone?: string;
  products?: ProductPriceInput[];
}

interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  villageArea?: string;
  serialNumber?: string | null;
  products?: ProductPriceInput[];
  createdById?: string;
  loginPhone?: string;
}

interface ListCustomersFilter {
  riderId?: string;
  status?: "active" | "inactive";
  search?: string;
}

interface SetCustomerPhoneInput {
  loginPhone: string;
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
  const today = new Date().toISOString().slice(0, 10);

  // Login phone defaults to the customer's contact phone so every new
  // customer can sign in with OTP immediately.
  const loginPhone = normalizeLoginPhone(input.loginPhone?.trim() || input.phone);
  const existingUser = await prisma.user.findUnique({ where: { loginPhone } });
  if (existingUser) throw new ConflictError("That phone number is already in use for login");

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        serialNumber,
        name: input.name,
        phone: input.phone,
        address: input.address,
        villageArea: input.villageArea,
        createdById: input.createdById,
      },
    });

    if (input.products && input.products.length > 0) {
      await tx.customerProductPrice.createMany({
        data: input.products.map((p) => ({
          customerId: customer.id,
          productId: p.productId,
          pricePerKg: p.pricePerKg,
          effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom) : new Date(today),
          createdById: input.createdById,
        })),
      });
    }

    if (loginPhone) {
      await tx.user.create({
        data: { loginPhone, role: "customer", linkedId: customer.id },
      });
    }

    return { customer, loginPhone: loginPhone ?? null };
  });
}
export async function listCustomers(filter: ListCustomersFilter) {
  const customers = await prisma.customer.findMany({
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
  const withLogin = await customerLoginSet(customers.map((c) => c.id));
  return customers.map((c) => ({ ...c, hasLogin: withLogin.has(c.id) }));
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { assignedRider: true },
  });
  if (!customer) {
    throw new NotFoundError("Customer not found");
  }
  const user = await prisma.user.findFirst({
    where: { linkedId: id, role: "customer" },
    select: { id: true, loginPhone: true },
  });
  return { ...customer, hasLogin: Boolean(user), loginPhone: user?.loginPhone ?? null };
}

async function customerLoginSet(customerIds: string[]): Promise<Set<string>> {
  if (customerIds.length === 0) return new Set();
  const users = await prisma.user.findMany({
    where: { role: "customer", linkedId: { in: customerIds } },
    select: { linkedId: true },
  });
  return new Set(users.map((u) => u.linkedId as string));
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const current = await getCustomerById(id);
  const { products, loginPhone, ...fields } = input;

  if (input.serialNumber) {
    const withSameSerial = await prisma.customer.findUnique({ where: { serialNumber: input.serialNumber } });
    if (withSameSerial && withSameSerial.id !== id) {
      throw new ConflictError("That serial number is already in use by another customer");
    }
  }

  // Decide which login phone should be in effect after this update:
  // - an explicit loginPhone always wins (normalized),
  // - otherwise, when the contact phone changed, the login follows the new
  //   phone so the customer can sign in with it immediately.
  let desiredLoginPhone: string | undefined;
  if (typeof loginPhone === "string" && loginPhone.trim()) {
    desiredLoginPhone = normalizeLoginPhone(loginPhone);
  } else if (fields.phone && fields.phone !== current.phone) {
    desiredLoginPhone = normalizeLoginPhone(fields.phone);
  }

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.update({ where: { id }, data: fields });

    if (products) {
      const today = new Date().toISOString().slice(0, 10);
      await tx.customerProductPrice.deleteMany({ where: { customerId: id } });
      if (products.length > 0) {
        await tx.customerProductPrice.createMany({
          data: products.map((p) => ({
            customerId: id,
            productId: p.productId,
            pricePerKg: p.pricePerKg,
            effectiveFrom: p.effectiveFrom ? new Date(p.effectiveFrom) : new Date(today),
            createdById: input.createdById ?? customer.createdById,
          })),
        });
      }
    }

    if (desiredLoginPhone) {
      const existing = await tx.user.findFirst({ where: { linkedId: id, role: "customer" } });
      if (existing) {
        if (desiredLoginPhone !== existing.loginPhone) {
          const taken = await tx.user.findUnique({ where: { loginPhone: desiredLoginPhone } });
          if (taken && taken.id !== existing.id) {
            throw new ConflictError("That phone number is already in use for login");
          }
          await tx.user.update({ where: { id: existing.id }, data: { loginPhone: desiredLoginPhone } });
        }
      } else {
        const taken = await tx.user.findUnique({ where: { loginPhone: desiredLoginPhone } });
        if (taken) {
          throw new ConflictError("That phone number is already in use for login");
        }
        await tx.user.create({ data: { loginPhone: desiredLoginPhone, role: "customer", linkedId: id } });
      }
    }

    return customer;
  });
}

export async function setCustomerPhone(id: string, input: SetCustomerPhoneInput) {
  await getCustomerById(id);

  const loginPhone = normalizeLoginPhone(input.loginPhone);

  const existingUser = await prisma.user.findFirst({
    where: { linkedId: id, role: "customer" },
  });

  if (!existingUser) {
    await assertPhoneFree(loginPhone);
    const user = await prisma.user.create({
      data: { loginPhone, role: "customer", linkedId: id },
    });
    return { loginPhone: user.loginPhone, created: true };
  }

  if (loginPhone !== existingUser.loginPhone) {
    await assertPhoneFree(loginPhone, existingUser.id);
  }

  await prisma.user.update({ where: { id: existingUser.id }, data: { loginPhone } });
  return { loginPhone, created: false };
}

async function assertPhoneFree(loginPhone: string, excludeId?: string) {
  const existing = await prisma.user.findUnique({ where: { loginPhone } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("That phone number is already in use for login");
  }
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
  await prisma.customerProductPrice.deleteMany({ where: { customerId: id } });
  await prisma.user.deleteMany({ where: { linkedId: id, role: "customer" } });
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
