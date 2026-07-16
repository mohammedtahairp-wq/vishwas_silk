import { Router } from "express";
import { asyncHandler } from "../../../lib/asyncHandler";
import {
  createProductHandler,
  deleteProductHandler,
  listProductsHandler,
  updateProductHandler,
} from "./products.controller";

export const productsRouter = Router();

productsRouter.post("/", asyncHandler(createProductHandler));
productsRouter.get("/", asyncHandler(listProductsHandler));
productsRouter.put("/:id", asyncHandler(updateProductHandler));
productsRouter.delete("/:id", asyncHandler(deleteProductHandler));
