import { apiClient } from "./client";
import type { City, CreateCustomerResult, CreateRiderResult, Customer, PickupAdmin, Price, Product, Rider, Transaction } from "./types";

export const adminApi = {
  // Cities
  createCity: (data: { name: string }) => apiClient.post<City>("/admin/cities", data).then((r) => r.data),
  listCities: () => apiClient.get<City[]>("/admin/cities").then((r) => r.data),
  updateCity: (id: string, data: { name: string }) =>
    apiClient.put<City>(`/admin/cities/${id}`, data).then((r) => r.data),
  deleteCity: (id: string) => apiClient.delete(`/admin/cities/${id}`).then((r) => r.data),

  createCustomer: (data: { name: string; phone: string; address?: string; villageArea?: string; username?: string; password?: string; products?: { productId: string; pricePerKg: number; effectiveFrom?: string }[] }) =>
    apiClient.post<CreateCustomerResult>("/admin/customers", data).then((r) => r.data),
  listCustomers: (params?: { rider_id?: string; status?: string }) =>
    apiClient.get<Customer[]>("/admin/customers", { params }).then((r) => r.data),
  getCustomer: (id: string) => apiClient.get<Customer>(`/admin/customers/${id}`).then((r) => r.data),
  updateCustomer: (id: string, data: Partial<Customer> & { products?: { productId: string; pricePerKg: number; effectiveFrom?: string }[] }) =>
    apiClient.put<Customer>(`/admin/customers/${id}`, data).then((r) => r.data),
  deleteCustomer: (id: string) => apiClient.delete(`/admin/customers/${id}`).then((r) => r.data),
  assignRider: (id: string, riderId: string | null) =>
    apiClient.put<Customer>(`/admin/customers/${id}/assign-rider`, { rider_id: riderId }).then((r) => r.data),
  setCustomerStatus: (id: string, status: "active" | "inactive") =>
    apiClient.put<Customer>(`/admin/customers/${id}/status`, { status }).then((r) => r.data),

  createRider: (data: { name: string; phone: string; villageArea?: string; username: string; password: string }) =>
    apiClient.post<CreateRiderResult>("/admin/riders", data).then((r) => r.data),
  listRiders: () => apiClient.get<Rider[]>("/admin/riders").then((r) => r.data),
  getRider: (id: string) => apiClient.get<Rider>(`/admin/riders/${id}`).then((r) => r.data),
  updateRider: (id: string, data: { name?: string; phone?: string; villageArea?: string; status?: "active" | "inactive" }) =>
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

  listPickups: (params?: { customer_id?: string; rider_id?: string; product_id?: string; from?: string; to?: string }) =>
    apiClient.get<PickupAdmin[]>("/admin/pickups", { params }).then((r) => r.data),

  listSettlements: () => apiClient.get<Transaction[]>("/admin/settlements").then((r) => r.data),
  generateSettlement: (data: { customer_id: string; month: number; year: number }) =>
    apiClient.post<Transaction>("/admin/settlements/generate", data).then((r) => r.data),
  markSettlementPaid: (id: string, paidDate: string) =>
    apiClient.put<Transaction>(`/admin/settlements/${id}/mark-paid`, { paid_date: paidDate }).then((r) => r.data),
};
