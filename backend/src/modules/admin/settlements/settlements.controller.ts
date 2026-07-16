import { Request, Response } from "express";
import { z } from "zod";
import * as settlementsService from "./settlements.service";

const generateSchema = z.object({
  customer_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

const markPaidSchema = z.object({
  paid_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export async function generateSettlementHandler(req: Request, res: Response) {
  const body = generateSchema.parse(req.body);
  const transaction = await settlementsService.generateSettlement(
    body.customer_id,
    body.month,
    body.year,
    req.user!.id
  );
  res.status(201).json(transaction);
}

export async function listSettlementsHandler(_req: Request, res: Response) {
  const settlements = await settlementsService.listSettlements();
  res.json(settlements);
}

export async function markSettlementPaidHandler(req: Request, res: Response) {
  const { paid_date } = markPaidSchema.parse(req.body);
  const transaction = await settlementsService.markSettlementPaid(req.params.id, new Date(paid_date));
  res.json(transaction);
}
