import { apiClient } from "./client";
import type { City, CreateCustomerResult, CreateRiderResult, Customer, PaidSettlementEntry, PickupAdmin, Price, Product, Rider, SettlementPreview, SettlementSummary, Transaction } from "./types";

export const adminApi = {
  // Cities
  createCity: (data: { name: string }) => apiClient.post<City>("/admin/cities", data).then((r) => r.data),
  listCities: () => apiClient.get<City[]>("/admin/cities").then((r) => r.data),
  updateCity: (id: string, data: { name: string }) =>
    apiClient.put<City>(`/admin/cities/${id}`, data).then((r) => r.data),
  deleteCity: (id: string) => apiClient.delete(`/admin/cities/${id}`).then((r) => r.data),

  createCustomer: (data: { name: string; phone: string; address?: string; villageArea?: string; loginPhone?: string; products?: { productId: string; pricePerKg: number; effectiveFrom?: string }[] }) =>
    apiClient.post<CreateCustomerResult>("/admin/customers", data).then((r) => r.data),
  listCustomers: (params?: { rider_id?: string; status?: string }) =>
    apiClient.get<Customer[]>("/admin/customers", { params }).then((r) => r.data),
  getCustomer: (id: string) => apiClient.get<Customer>(`/admin/customers/${id}`).then((r) => r.data),
  updateCustomer: (id: string, data: Partial<Customer> & { products?: { productId: string; pricePerKg: number; effectiveFrom?: string }[]; loginPhone?: string }) =>
    apiClient.put<Customer>(`/admin/customers/${id}`, data).then((r) => r.data),
  deleteCustomer: (id: string) => apiClient.delete(`/admin/customers/${id}`).then((r) => r.data),
  assignRider: (id: string, riderId: string | null) =>
    apiClient.put<Customer>(`/admin/customers/${id}/assign-rider`, { rider_id: riderId }).then((r) => r.data),
  setCustomerStatus: (id: string, status: "active" | "inactive") =>
    apiClient.put<Customer>(`/admin/customers/${id}/status`, { status }).then((r) => r.data),
  setCustomerLogin: (id: string, data: { loginPhone: string }) =>
    apiClient.put<{ loginPhone: string; created: boolean }>(`/admin/customers/${id}/login`, data).then((r) => r.data),

  createRider: (data: { name: string; phone: string; villageArea?: string; loginPhone: string }) =>
    apiClient.post<CreateRiderResult>("/admin/riders", data).then((r) => r.data),
  listRiders: () => apiClient.get<Rider[]>("/admin/riders").then((r) => r.data),
  getRider: (id: string) => apiClient.get<Rider>(`/admin/riders/${id}`).then((r) => r.data),
  updateRider: (id: string, data: { name?: string; phone?: string; villageArea?: string; status?: "active" | "inactive"; loginPhone?: string }) =>
    apiClient.put<Rider>(`/admin/riders/${id}`, data).then((r) => r.data),
  deleteRider: (id: string) => apiClient.delete(`/admin/riders/${id}`).then((r) => r.data),
  getRiderCustomers: (id: string) => apiClient.get<Customer[]>(`/admin/riders/${id}/customers`).then((r) => r.data),

  createProduct: (data: { name: string; unit?: string; global_price_per_kg: number; effective_from: string }) =>
    apiClient.post<Product>("/admin/products", data).then((r) => r.data),
  listProducts: () => apiClient.get<Product[]>("/admin/products").then((r) => r.data),
  updateProduct: (id: string, data: { name?: string; unit?: string; status?: "active" | "inactive" }) =>
    apiClient.put<Product>(`/admin/products/${id}`, data).then((r) => r.data),
  deleteProduct: (id: string) => apiClient.delete(`/admin/products/${id}`).then((r) => r.data),

  setPrice: (data: { customer_id?: string | null; product_id: string; price_per_kg: number; effective_from: string }) =>
    apiClient.post<Price>("/admin/pricing", data).then((r) => r.data),
  priceHistory: (customerId?: string) =>
    apiClient.get<Price[]>("/admin/pricing", { params: customerId ? { customer_id: customerId } : undefined }).then((r) => r.data),

  listPickups: (params?: { customer_id?: string; rider_id?: string; product_id?: string; status?: string; from?: string; to?: string }) =>
    apiClient.get<PickupAdmin[]>("/admin/pickups", { params }).then((r) => r.data),
  createBatchPickups: (data: { customer_id: string; rider_id: string; items: { product_id: string; kg: number }[]; pickup_date?: string }) =>
    apiClient.post<PickupAdmin[]>("/admin/pickups", data).then((r) => r.data),
  updatePickup: (id: string, data: { customer_id: string; rider_id: string; product_id: string; kg: number; pickup_date: string }) =>
    apiClient.put<PickupAdmin>(`/admin/pickups/${id}`, data).then((r) => r.data),
  deletePickup: (id: string) => apiClient.delete(`/admin/pickups/${id}`).then((r) => r.data),
  markPickupPaid: (id: string, paidDate: string) =>
    apiClient.put<PickupAdmin>(`/admin/pickups/${id}/mark-paid`, { paid_date: paidDate }).then((r) => r.data),

  listSettlements: (params?: { status?: string; customer_id?: string; from_date?: string; to_date?: string; product_id?: string }) =>
    apiClient.get<Transaction[]>("/admin/settlements", { params }).then((r) => r.data),
  previewSettlement: (data: { customer_id: string; from_date: string; to_date: string }) =>
    apiClient.post<SettlementPreview>("/admin/settlements/preview", data).then((r) => r.data),
  generateSettlement: (data: { customer_id: string; from_date: string; to_date: string }) =>
    apiClient.post<Transaction>("/admin/settlements/generate", data).then((r) => r.data),
  markSettlementPaid: (id: string, paidDate: string) =>
    apiClient.put<Transaction>(`/admin/settlements/${id}/mark-paid`, { paid_date: paidDate }).then((r) => r.data),

  settlementsSummary: (params?: { customer_id?: string; product_id?: string; city_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<SettlementSummary[]>("/admin/settlements/summary", { params }).then((r) => r.data),
  markBulkPaid: (data: { customer_id: string; from_date: string; to_date: string }) =>
    apiClient.post<{ updatedCount: number }>("/admin/settlements/mark-bulk-paid", data).then((r) => r.data),
  paidSettlementsSummary: (params?: { customer_id?: string; product_id?: string; city_id?: string; from_date?: string; to_date?: string }) =>
    apiClient.get<PaidSettlementEntry[]>("/admin/settlements/paid-summary", { params }).then((r) => r.data),
};
