import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import * as pickupsService from "../admin/pickups/pickups.service";
import { assertCustomerBelongsToRider } from "../admin/customers/customers.service";
import { serializePickups } from "../../serializers/pickup.serializer";

const createPickupSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  kg: z.number().positive(),
  pickup_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
});

export async function myCustomersHandler(req: Request, res: Response) {
  const customers = await prisma.customer.findMany({
    where: { assignedRiderId: req.user!.linkedId!, status: "active" },
    orderBy: { name: "asc" },
  });
  res.json(customers);
}

export async function createPickupHandler(req: Request, res: Response) {
  const body = createPickupSchema.parse(req.body);
  const riderId = req.user!.linkedId!;

  await assertCustomerBelongsToRider(body.customer_id, riderId);

  const pickup = await pickupsService.createPickup({
    customerId: body.customer_id,
    riderId,
    productId: body.product_id,
    kg: body.kg,
    pickupDate: body.pickup_date ? new Date(body.pickup_date) : undefined,
  });

  res.status(201).json(serializePickups([pickup], "rider")[0]);
}

export async function myPickupsHandler(req: Request, res: Response) {
  const pickups = await pickupsService.listPickups({ riderId: req.user!.linkedId! });
  res.json(serializePickups(pickups, "rider"));
}

export async function priceAvailabilityHandler(req: Request, res: Response) {
  const query = z.object({ customer_id: z.string().uuid(), product_id: z.string().uuid() }).parse(req.query);
  await assertCustomerBelongsToRider(query.customer_id, req.user!.linkedId!);
  res.json({ available: await pickupsService.priceAvailable(query.customer_id, query.product_id) });
}
