import { Request, Response } from "express";
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
  const { customer_id, rider_id, product_id, from, to } = req.query;
  const pickups = await pickupsService.listPickups({
    customerId: typeof customer_id === "string" ? customer_id : undefined,
    riderId: typeof rider_id === "string" ? rider_id : undefined,
    productId: typeof product_id === "string" ? product_id : undefined,
    from: queryDate(from),
    to: queryDate(to, true),
  });
  // Admin role — serializer returns full rows including price/amount.
  res.json(serializePickups(pickups, req.user!.role));
}
