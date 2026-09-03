import { apiClient } from "./client";
import type { Customer, CustomerProduct, DieselLog, PickupSafe, Vehicle } from "./types";

export const riderApi = {
  myCustomers: () => apiClient.get<Customer[]>("/rider/customers").then((r) => r.data),
  customerProducts: (customerId: string) =>
    apiClient.get<CustomerProduct[]>(`/rider/customers/${customerId}/products`).then((r) => r.data),
  logPickup: (data: { customer_id: string; product_id: string; kg: number; pickup_date?: string }) =>
    apiClient.post<PickupSafe>("/rider/pickups", data).then((r) => r.data),
  logBatchPickup: (data: { customer_id: string; items: { product_id: string; kg: number }[]; pickup_date?: string }) =>
    apiClient.post<PickupSafe[]>("/rider/pickups/batch", data).then((r) => r.data),
  myPickups: () => apiClient.get<PickupSafe[]>("/rider/pickups").then((r) => r.data),
  updatePickup: (id: string, data: { kg: number; pickup_date?: string }) =>
    apiClient.put<PickupSafe>(`/rider/pickups/${id}`, data).then((r) => r.data),
  deletePickup: (id: string) => apiClient.delete(`/rider/pickups/${id}`).then((r) => r.data),
  priceAvailability: (customerId: string, productId: string) =>
    apiClient.get<{ available: boolean }>("/rider/price-availability", { params: { customer_id: customerId, product_id: productId } }).then((r) => r.data.available),
  dieselVehicles: () => apiClient.get<Vehicle[]>("/rider/diesel/vehicles").then((r) => r.data),
  dieselLogs: (params?: { from?: string; to?: string }) =>
    apiClient.get<DieselLog[]>("/rider/diesel/logs", { params }).then((r) => r.data),
  createDieselLog: (data: { vehicle_id: string; diesel_date?: string; diesel_amount: number; start_km: number; end_km: number }) =>
    apiClient.post<DieselLog>("/rider/diesel/logs", data).then((r) => r.data),
  updateDieselLog: (id: string, data: { vehicle_id?: string; diesel_date?: string; diesel_amount?: number; start_km?: number; end_km?: number }) =>
    apiClient.put<DieselLog>(`/rider/diesel/logs/${id}`, data).then((r) => r.data),
  deleteDieselLog: (id: string) => apiClient.delete(`/rider/diesel/logs/${id}`).then((r) => r.data),
};
