import { Request, Response } from "express";
import { z } from "zod";
import * as ridersService from "./riders.service";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  villageArea: z.string().min(1).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, "Username may only contain letters, numbers, dots, underscores and hyphens"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  villageArea: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function createRiderHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const rider = await ridersService.createRider(body);
  res.status(201).json(rider);
}

export async function listRidersHandler(_req: Request, res: Response) {
  const riders = await ridersService.listRiders();
  res.json(riders);
}

export async function getRiderHandler(req: Request, res: Response) {
  const rider = await ridersService.getRiderById(req.params.id);
  res.json(rider);
}

export async function updateRiderHandler(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const rider = await ridersService.updateRider(req.params.id, body);
  res.json(rider);
}

export async function deleteRiderHandler(req: Request, res: Response) {
  await ridersService.deleteRider(req.params.id);
  res.status(204).send();
}

export async function getRiderCustomersHandler(req: Request, res: Response) {
  const customers = await ridersService.getRiderCustomers(req.params.id);
  res.json(customers);
}
