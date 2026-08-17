import { Request, Response } from "express";
import { z } from "zod";
import * as settlementsService from "./settlements.service";

const previewSchema = z.object({
  customer_id: z.string().uuid(),
  from_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  to_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

const generateSchema = z.object({
  customer_id: z.string().uuid(),
  from_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  to_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

const markPaidSchema = z.object({
  paid_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function previewSettlementHandler(req: Request, res: Response) {
  const body = previewSchema.parse(req.body);
  const preview = await settlementsService.previewSettlement(
    body.customer_id,
    new Date(body.from_date),
    new Date(body.to_date)
  );
  res.json(preview);
}

export async function generateSettlementHandler(req: Request, res: Response) {
  const body = generateSchema.parse(req.body);
  const transaction = await settlementsService.generateSettlement(
    body.customer_id,
    new Date(body.from_date),
    new Date(body.to_date),
    req.user!.id
  );
  res.status(201).json(transaction);
}

export async function listSettlementsHandler(req: Request, res: Response) {
  const { status, customer_id, from_date, to_date, product_id } = req.query;
  const settlements = await settlementsService.listSettlements({
    status: status as string | undefined,
    customerId: customer_id as string | undefined,
    fromDate: from_date as string | undefined,
    toDate: to_date as string | undefined,
    productId: product_id as string | undefined,
  });
  res.json(settlements);
}

export async function markSettlementPaidHandler(req: Request, res: Response) {
  const { paid_date } = markPaidSchema.parse(req.body);
  const transaction = await settlementsService.markSettlementPaid(req.params.id, new Date(paid_date));
  res.json(transaction);
}
