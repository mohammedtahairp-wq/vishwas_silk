import { apiClient } from "./client";
import type { Customer, PickupSafe } from "./types";

export const riderApi = {
  myCustomers: () => apiClient.get<Customer[]>("/rider/customers").then((r) => r.data),
  logPickup: (data: { customer_id: string; product_id: string; kg: number; pickup_date?: string }) =>
    apiClient.post<PickupSafe>("/rider/pickups", data).then((r) => r.data),
  myPickups: () => apiClient.get<PickupSafe[]>("/rider/pickups").then((r) => r.data),
  priceAvailability: (customerId: string, productId: string) =>
    apiClient.get<{ available: boolean }>("/rider/price-availability", { params: { customer_id: customerId, product_id: productId } }).then((r) => r.data.available),
};
