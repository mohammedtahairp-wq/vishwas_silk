export interface Rider {
  id: string;
  name: string;
  phone: string;
  villageArea?: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CreateRiderResult {
  rider: Rider;
  username: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  villageArea?: string | null;
  assignedRiderId?: string | null;
  assignedRider?: Rider | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface City {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  status: "active" | "inactive";
}

export interface Price {
  id: string;
  customerId: string | null;
  productId: string;
  pricePerKg: string;
  effectiveFrom: string;
  product?: Product;
}

export interface PickupAdmin {
  id: string;
  customerId: string;
  riderId: string;
  productId: string;
  kg: string;
  pickupDate: string;
  pricePerKgSnapshot: string;
  amount: string;
  status: string;
  customer?: Customer;
  rider?: Rider;
  product?: Product;
}

export interface PickupSafe {
  id: string;
  customerId: string;
  riderId: string;
  productId: string;
  kg: string;
  pickupDate: string;
  status: string;
  customer?: Customer;
  rider?: Rider;
  product?: Product;
}

export interface TransactionLineItem {
  id: string;
  productId: string;
  totalKg: string;
  pricePerKg: string;
  amount: string;
  product?: Product;
}

export interface Transaction {
  id: string;
  customerId: string;
  month: number;
  year: number;
  totalKg: string;
  totalAmount: string;
  status: "pending" | "paid";
  paidDate: string | null;
  lineItems?: TransactionLineItem[];
}
