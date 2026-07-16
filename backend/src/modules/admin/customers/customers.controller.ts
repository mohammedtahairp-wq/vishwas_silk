import { Request, Response } from "express";
import { z } from "zod";
import * as customersService from "./customers.service";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  address: z.string().min(1),
  villageArea: z.string().optional(),
});

const updateSchema = createSchema.partial();

const assignRiderSchema = z.object({
  rider_id: z.string().uuid().nullable(),
});

const statusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export async function createCustomerHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const customer = await customersService.createCustomer({
    ...body,
    createdById: req.user!.id,
  });
  res.status(201).json(customer);
}

export async function listCustomersHandler(req: Request, res: Response) {
  const riderId = typeof req.query.rider_id === "string" ? req.query.rider_id : undefined;
  const status =
    req.query.status === "active" || req.query.status === "inactive" ? req.query.status : undefined;
  const customers = await customersService.listCustomers({ riderId, status });
  res.json(customers);
}

export async function getCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.getCustomerById(req.params.id);
  res.json(customer);
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const customer = await customersService.updateCustomer(req.params.id, body);
  res.json(customer);
}

export async function deleteCustomerHandler(req: Request, res: Response) {
  await customersService.deleteCustomer(req.params.id);
  res.status(204).send();
}

export async function assignRiderHandler(req: Request, res: Response) {
  const { rider_id } = assignRiderSchema.parse(req.body);
  const customer = await customersService.assignRider(req.params.id, rider_id);
  res.json(customer);
}

export async function setStatusHandler(req: Request, res: Response) {
  const { status } = statusSchema.parse(req.body);
  const customer = await customersService.setCustomerStatus(req.params.id, status);
  res.json(customer);
}
