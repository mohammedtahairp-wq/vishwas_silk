import { prisma } from "../../../lib/prisma";
import { ConflictError, NotFoundError } from "../../../lib/errors";

interface CreateProductInput {
  name: string;
  unit?: string;
  globalPricePerKg: number;
  effectiveFrom: Date;
  createdById: string;
}

interface UpdateProductInput {
  name?: string;
  unit?: string;
  status?: "active" | "inactive";
}

export function createProduct(input: CreateProductInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: { name: input.name, unit: input.unit } });
    await tx.customerProductPrice.create({ data: { customerId: null, productId: product.id, pricePerKg: input.globalPricePerKg, effectiveFrom: input.effectiveFrom, createdById: input.createdById } });
    return product;
  });
}

export function listProducts() {
  return prisma.product.findMany({ orderBy: { createdAt: "asc" } });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return prisma.product.update({ where: { id }, data: input });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  const [pickups, lineItems] = await Promise.all([
    prisma.pickup.count({ where: { productId: id } }),
    prisma.transactionLineItem.count({ where: { productId: id } }),
  ]);
  if (pickups > 0 || lineItems > 0) {
    throw new ConflictError(
      "Cannot delete a product used in pickups or settlements. Mark it inactive instead."
    );
  }
  await prisma.customerProductPrice.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
}
