import { Request, Response } from "express";
import { z } from "zod";
import * as pickupsService from "./pickups.service";
import { serializePickups } from "../../../serializers/pickup.serializer";

function queryDate(value: unknown, endOfDay = false) {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

export async function listPickupsHandler(req: Request, res: Response) {
  const { customer_id, rider_id, product_id, status, from, to } = req.query;
  const pickups = await pickupsService.listPickups({
    customerId: typeof customer_id === "string" ? customer_id : undefined,
    riderId: typeof rider_id === "string" ? rider_id : undefined,
    productId: typeof product_id === "string" ? product_id : undefined,
    status: typeof status === "string" ? status : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  // Admin role — serializer returns full rows including price/amount.
  res.json(serializePickups(pickups, req.user!.role));
}

const batchPickupSchema = z.object({
  customer_id: z.string().uuid(),
  rider_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    kg: z.number().positive(),
  })).min(1),
  pickup_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
});

const updatePickupSchema = z.object({
  customer_id: z.string().uuid(),
  rider_id: z.string().uuid(),
  product_id: z.string().uuid(),
  kg: z.number().positive(),
  pickup_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function createBatchPickupHandler(req: Request, res: Response) {
  const body = batchPickupSchema.parse(req.body);

  const pickups = await pickupsService.createBatchPickups({
    customerId: body.customer_id,
    riderId: body.rider_id,
    items: body.items.map((item) => ({ productId: item.product_id, kg: item.kg })),
    pickupDate: body.pickup_date ? new Date(body.pickup_date) : undefined,
  });

  res.status(201).json(serializePickups(pickups, "admin"));
}

export async function updatePickupHandler(req: Request, res: Response) {
  const { id } = req.params;
  const body = updatePickupSchema.parse(req.body);

  const pickup = await pickupsService.updatePickup(id, {
    customerId: body.customer_id,
    riderId: body.rider_id,
    productId: body.product_id,
    kg: body.kg,
    pickupDate: new Date(body.pickup_date),
  });

  res.json(serializePickups([pickup], "admin")[0]);
}

export async function deletePickupHandler(req: Request, res: Response) {
  const { id } = req.params;
  await pickupsService.deletePickup(id);
  res.status(204).end();
}

const markPaidSchema = z.object({
  paid_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function markPickupPaidHandler(req: Request, res: Response) {
  const { paid_date } = markPaidSchema.parse(req.body);
  const pickup = await pickupsService.markPickupPaid(req.params.id, new Date(paid_date));
  res.json(serializePickups([pickup], "admin")[0]);
}
