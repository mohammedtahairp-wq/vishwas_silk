import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createCityHandler,
  deleteCityHandler,
  listCitiesHandler,
  updateCityHandler,
} from "./cities.controller";

export const citiesRouter = Router();

citiesRouter.post("/", asyncHandler(createCityHandler));
citiesRouter.get("/", asyncHandler(listCitiesHandler));
citiesRouter.put("/:id", asyncHandler(updateCityHandler));
citiesRouter.delete("/:id", asyncHandler(deleteCityHandler));
