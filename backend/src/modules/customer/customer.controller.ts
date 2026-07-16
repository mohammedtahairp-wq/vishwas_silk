import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import * as pickupsService from "../admin/pickups/pickups.service";
import { serializePickups } from "../../serializers/pickup.serializer";

export async function myProfileHandler(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({ where: { id: req.user!.linkedId! } });
  if (!customer) {
    throw new NotFoundError("Customer profile not found");
  }
  res.json(customer);
}

export async function myPickupsHandler(req: Request, res: Response) {
  const pickups = await pickupsService.listPickups({ customerId: req.user!.linkedId! });
  // view=daily|monthly|product grouping is left to the frontend for this
  // scaffold; the API always returns the full kg-based list, pre-stripped.
  res.json(serializePickups(pickups, "customer"));
}

export async function myTransactionsHandler(req: Request, res: Response) {
  const transactions = await prisma.transaction.findMany({
    where: { customerId: req.user!.linkedId! },
    include: { lineItems: { include: { product: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  res.json(transactions);
}
