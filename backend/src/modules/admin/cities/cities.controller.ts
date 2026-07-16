import { Request, Response } from "express";
import { z } from "zod";
import * as citiesService from "./cities.service";

const nameSchema = z.object({ name: z.string().min(1) });

export async function createCityHandler(req: Request, res: Response) {
  const { name } = nameSchema.parse(req.body);
  const city = await citiesService.createCity(name);
  res.status(201).json(city);
}

export async function listCitiesHandler(_req: Request, res: Response) {
  const cities = await citiesService.listCities();
  res.json(cities);
}

export async function updateCityHandler(req: Request, res: Response) {
  const { name } = nameSchema.parse(req.body);
  const city = await citiesService.updateCity(req.params.id, name);
  res.json(city);
}

export async function deleteCityHandler(req: Request, res: Response) {
  await citiesService.deleteCity(req.params.id);
  res.status(204).send();
}
