import { Pickup } from "@prisma/client";

type Role = "admin" | "rider" | "customer";

/**
 * Single enforcement point for spec rule 2: price_per_kg and amount must
 * never reach a rider or customer response, in any endpoint. Every
 * controller returning pickup data MUST route through this — never
 * res.json(rawPrismaResult) for the Pickup model.
 */
export function serializePickup<T extends Pickup>(pickup: T, role: Role) {
  if (role === "admin") {
    return pickup;
  }
  const { pricePerKgSnapshot, amount, ...safe } = pickup;
  return safe;
}

export function serializePickups<T extends Pickup>(pickups: T[], role: Role) {
  return pickups.map((p) => serializePickup(p, role));
}
