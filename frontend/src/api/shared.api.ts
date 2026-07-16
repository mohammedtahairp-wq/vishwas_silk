import { apiClient } from "./client";
import type { Product } from "./types";

export const sharedApi = {
  listProducts: () => apiClient.get<Product[]>("/products").then((r) => r.data),
};
