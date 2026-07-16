import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../lib/prisma";

// Product name/unit carry no pricing info (prices live on CustomerProductPrice,
// which stays admin-only), so it's safe to expose the active product list to
// any authenticated role — rider and customer both need it for pickup/pricing
// dropdowns even though it's not itemized as a role-specific endpoint in the spec.
export const sharedProductsRouter = Router();

sharedProductsRouter.use(authenticate);

sharedProductsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: {
        status: "active",
        prices: { some: { effectiveFrom: { lte: new Date() } } },
      },
      orderBy: { name: "asc" },
    });
    res.json(products);
  })
);
