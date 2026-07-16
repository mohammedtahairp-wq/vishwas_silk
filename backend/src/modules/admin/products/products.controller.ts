import { Request, Response } from "express";
import { z } from "zod";
import * as productsService from "./products.service";

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).optional(),
  global_price_per_kg: z.number().positive(),
  effective_from: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function createProductHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const product = await productsService.createProduct({ name: body.name, unit: body.unit, globalPricePerKg: body.global_price_per_kg, effectiveFrom: new Date(body.effective_from), createdById: req.user!.id });
  res.status(201).json(product);
}

export async function listProductsHandler(_req: Request, res: Response) {
  const products = await productsService.listProducts();
  res.json(products);
}

export async function updateProductHandler(req: Request, res: Response) {
  const body = updateSchema.parse(req.body);
  const product = await productsService.updateProduct(req.params.id, body);
  res.json(product);
}

export async function deleteProductHandler(req: Request, res: Response) {
  await productsService.deleteProduct(req.params.id);
  res.status(204).send();
}
