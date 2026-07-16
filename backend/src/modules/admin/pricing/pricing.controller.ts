import { Request, Response } from "express";
import { z } from "zod";
import { BadRequestError } from "../../../lib/errors";
import * as pricingService from "./pricing.service";

const setPriceSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid(),
  price_per_kg: z.number().positive(),
  effective_from: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function setPriceHandler(req: Request, res: Response) {
  const body = setPriceSchema.parse(req.body);
  const price = await pricingService.setPrice({
    customerId: body.customer_id ?? null,
    productId: body.product_id,
    pricePerKg: body.price_per_kg,
    effectiveFrom: new Date(body.effective_from),
    createdById: req.user!.id,
  });
  res.status(201).json(price);
}

export async function priceHistoryHandler(req: Request, res: Response) {
  const customerId = req.query.customer_id;
  if (customerId !== undefined && typeof customerId !== "string") {
    throw new BadRequestError("customer_id must be a string");
  }
  const parsedCustomerId = typeof customerId === "string"
    ? z.string().uuid().parse(customerId)
    : null;
  const history = await pricingService.priceHistory(parsedCustomerId);
  res.json(history);
}
