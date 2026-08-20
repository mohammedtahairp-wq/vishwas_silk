import { Request, Response } from "express";
import { z } from "zod";
import * as customersService from "./customers.service";

const productPriceSchema = z.object({
  productId: z.string().uuid(),
  pricePerKg: z.number().positive(),
  effectiveFrom: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  address: z.string().optional(),
  villageArea: z.string().optional(),
  loginPhone: z.string().min(6, "Login phone must be at least 6 characters").optional(),
  products: z.array(productPriceSchema).optional(),
});

const serialNumberField = z.union([z.string().trim().max(50), z.null()]).optional();

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  address: z.string().optional(),
  villageArea: z.string().optional(),
  serialNumber: serialNumberField,
  products: z.array(productPriceSchema).optional(),
  loginPhone: z.string().min(6, "Login phone must be at least 6 characters").optional(),
});

const phoneSchema = z.object({
  loginPhone: z.string().min(6, "Login phone must be at least 6 characters"),
});

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
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const customers = await customersService.listCustomers({ riderId, status, search });
  res.json(customers);
}

export async function getCustomerHandler(req: Request, res: Response) {
  const customer = await customersService.getCustomerById(req.params.id);
  res.json(customer);
}

export async function updateCustomerHandler(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const customer = await customersService.updateCustomer(req.params.id, { ...body, createdById: req.user!.id });
  res.json(customer);
}

export async function setCustomerPhoneHandler(req: Request, res: Response) {
  const body = phoneSchema.parse(req.body);
  const result = await customersService.setCustomerPhone(req.params.id, body);
  res.json(result);
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
