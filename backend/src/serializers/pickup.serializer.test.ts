import { describe, expect, it } from "vitest";
import { Pickup } from "@prisma/client";
import { serializePickup, serializePickups } from "./pickup.serializer";

function makePickup(): Pickup {
  return {
    id: "pickup-1",
    customerId: "customer-1",
    riderId: "rider-1",
    productId: "product-1",
    kg: 10 as unknown as Pickup["kg"],
    pickupDate: new Date("2026-07-01"),
    pricePerKgSnapshot: 40 as unknown as Pickup["pricePerKgSnapshot"],
    amount: 400 as unknown as Pickup["amount"],
    status: "pending",
    createdAt: new Date("2026-07-01"),
  };
}

describe("pickup serializer", () => {
  it("returns full fields for admin", () => {
    const result = serializePickup(makePickup(), "admin");
    expect(result).toHaveProperty("pricePerKgSnapshot");
    expect(result).toHaveProperty("amount");
  });

  it("strips price and amount for rider", () => {
    const result = serializePickup(makePickup(), "rider");
    expect(result).not.toHaveProperty("pricePerKgSnapshot");
    expect(result).not.toHaveProperty("amount");
  });

  it("strips price and amount for customer", () => {
    const result = serializePickup(makePickup(), "customer");
    expect(result).not.toHaveProperty("pricePerKgSnapshot");
    expect(result).not.toHaveProperty("amount");
  });

  it("strips price and amount across a list for rider/customer", () => {
    const results = serializePickups([makePickup(), makePickup()], "customer");
    for (const r of results) {
      expect(r).not.toHaveProperty("pricePerKgSnapshot");
      expect(r).not.toHaveProperty("amount");
    }
  });
});
