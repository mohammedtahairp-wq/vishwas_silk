import { apiClient } from "./client";
import type { Customer, PickupSafe, Transaction } from "./types";

export const customerApi = {
  myProfile: () => apiClient.get<Customer>("/customer/profile").then((r) => r.data),
  myPickups: () => apiClient.get<PickupSafe[]>("/customer/pickups").then((r) => r.data),
  myTransactions: () => apiClient.get<Transaction[]>("/customer/transactions").then((r) => r.data),
};
