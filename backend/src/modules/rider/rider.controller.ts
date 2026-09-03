import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import * as pickupsService from "../admin/pickups/pickups.service";
import * as dieselService from "./diesel.service";
import { assertCustomerBelongsToRider } from "../admin/customers/customers.service";
import { serializePickups } from "../../serializers/pickup.serializer";
import { ForbiddenError } from "../../lib/errors";

const createPickupSchema = z.object({
  customer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  kg: z.number().positive(),
  pickup_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
});

const updateOwnPickupSchema = z.object({
  kg: z.number().positive(),
  pickup_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
});

const batchPickupSchema = z.object({
  customer_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    kg: z.number().positive(),
  })).min(1),
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

export async function customerProductsHandler(req: Request, res: Response) {
  const riderId = req.user!.linkedId!;
  const { id } = req.params;
  await assertCustomerBelongsToRider(id, riderId);

  const prices = await prisma.customerProductPrice.findMany({
    where: { customerId: id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const latest = new Map<string, { productId: string; productName: string; productUnit: string; pricePerKg: string; effectiveFrom: string }>();
  for (const p of prices) {
    const key = p.productId;
    if (!latest.has(key)) {
      latest.set(key, {
        productId: p.productId,
        productName: p.product.name,
        productUnit: p.product.unit,
        pricePerKg: String(p.pricePerKg),
        effectiveFrom: p.effectiveFrom.toISOString().slice(0, 10),
      });
    }
  }

  res.json([...latest.values()]);
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

export async function createBatchPickupHandler(req: Request, res: Response) {
  const body = batchPickupSchema.parse(req.body);
  const riderId = req.user!.linkedId!;

  await assertCustomerBelongsToRider(body.customer_id, riderId);

  const pickups = await pickupsService.createBatchPickups({
    customerId: body.customer_id,
    riderId,
    items: body.items.map((item) => ({ productId: item.product_id, kg: item.kg })),
    pickupDate: body.pickup_date ? new Date(body.pickup_date) : undefined,
  });

  res.status(201).json(serializePickups(pickups, "rider"));
}

export async function myPickupsHandler(req: Request, res: Response) {
  const pickups = await pickupsService.listPickups({ riderId: req.user!.linkedId! });
  res.json(serializePickups(pickups, "rider"));
}

export async function updateOwnPickupHandler(req: Request, res: Response) {
  const { id } = req.params;
  const body = updateOwnPickupSchema.parse(req.body);
  const riderId = req.user!.linkedId!;

  const existing = await pickupsService.getPickupById(id);
  if (!existing) {
    throw new ForbiddenError("Pickup not found");
  }
  if (existing.riderId !== riderId) {
    throw new ForbiddenError("This pickup does not belong to you");
  }
  await assertCustomerBelongsToRider(existing.customerId, riderId);

  const pickup = await pickupsService.updatePickup(id, {
    customerId: existing.customerId,
    riderId,
    productId: existing.productId,
    kg: body.kg,
    pickupDate: body.pickup_date ? new Date(body.pickup_date) : existing.pickupDate,
  });

  res.json(serializePickups([pickup], "rider")[0]);
}

export async function deleteOwnPickupHandler(req: Request, res: Response) {
  const { id } = req.params;
  const riderId = req.user!.linkedId!;

  const existing = await pickupsService.getPickupById(id);
  if (!existing) {
    throw new ForbiddenError("Pickup not found");
  }
  if (existing.riderId !== riderId) {
    throw new ForbiddenError("This pickup does not belong to you");
  }

  await pickupsService.deletePickup(id);
  res.status(204).end();
}

export async function priceAvailabilityHandler(req: Request, res: Response) {
  const query = z.object({ customer_id: z.string().uuid(), product_id: z.string().uuid() }).parse(req.query);
  await assertCustomerBelongsToRider(query.customer_id, req.user!.linkedId!);
  res.json({ available: await pickupsService.priceAvailable(query.customer_id, query.product_id) });
}

const dieselLogSchema = z.object({
  vehicle_id: z.string().uuid(),
  diesel_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  diesel_amount: z.number().positive(),
  start_km: z.number().nonnegative(),
  end_km: z.number().nonnegative(),
});

const updateDieselLogSchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  diesel_date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .optional(),
  diesel_amount: z.number().positive().optional(),
  start_km: z.number().nonnegative().optional(),
  end_km: z.number().nonnegative().optional(),
});

export async function riderVehiclesHandler(req: Request, res: Response) {
  res.json(await dieselService.listActiveVehicles());
}

export async function createDieselLogHandler(req: Request, res: Response) {
  const body = dieselLogSchema.parse(req.body);
  const log = await dieselService.createDieselLog({
    vehicleId: body.vehicle_id,
    riderId: req.user!.linkedId!,
    dieselDate: body.diesel_date ? new Date(body.diesel_date) : new Date(),
    dieselAmount: body.diesel_amount,
    startKm: body.start_km,
    endKm: body.end_km,
    createdById: req.user!.id,
  });
  res.status(201).json(log);
}

export async function listDieselLogsHandler(req: Request, res: Response) {
  const { from, to } = req.query;
  const logs = await dieselService.listDieselLogs(req.user!.linkedId!, {
    from: typeof from === "string" && !Number.isNaN(Date.parse(from)) ? new Date(from) : undefined,
    to: typeof to === "string" && !Number.isNaN(Date.parse(to)) ? new Date(to) : undefined,
  });
  res.json(logs);
}

export async function updateOwnDieselLogHandler(req: Request, res: Response) {
  const body = updateDieselLogSchema.parse(req.body);
  const log = await dieselService.updateOwnDieselLog(req.params.id, req.user!.linkedId!, {
    vehicleId: body.vehicle_id,
    dieselDate: body.diesel_date ? new Date(body.diesel_date) : undefined,
    dieselAmount: body.diesel_amount,
    startKm: body.start_km,
    endKm: body.end_km,
  });
  res.json(log);
}

export async function deleteOwnDieselLogHandler(req: Request, res: Response) {
  await dieselService.deleteOwnDieselLog(req.params.id, req.user!.linkedId!);
  res.status(204).end();
}
