export interface Rider {
  id: string;
  name: string;
  phone: string;
  villageArea?: string | null;
  status: "active" | "inactive";
  createdAt: string;
  loginPhone?: string | null;
}

export interface CreateRiderResult {
  rider: Rider;
  loginPhone: string;
}

export interface Customer {
  id: string;
  serialNumber?: string | null;
  name: string;
  phone: string;
  address: string;
  villageArea?: string | null;
  cityId?: string | null;
  assignedRiderId?: string | null;
  assignedRider?: Rider | null;
  status: "active" | "inactive";
  hasLogin?: boolean;
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

export interface CustomerProduct {
  productId: string;
  productName: string;
  productUnit: string;
  pricePerKg: string;
  effectiveFrom: string;
}

export interface CreateCustomerResult {
  customer: Customer;
  loginPhone: string | null;
}

export interface Pickup {
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

export type PickupAdmin = Pickup;

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
  fromDate: string | null;
  toDate: string | null;
  totalKg: string;
  totalAmount: string;
  status: "pending" | "paid";
  paidDate: string | null;
  customer?: Customer;
  lineItems?: TransactionLineItem[];
}

export interface SettlementPreview {
  customerId: string;
  fromDate: string;
  toDate: string;
  pickupsCount: number;
  totalKg: number;
  totalAmount: number;
  lineItems: {
    productId: string;
    productName: string;
    totalKg: number;
    pricePerKg: number;
    amount: number;
    count: number;
  }[];
}

export interface SettlementSummary {
  customerId: string;
  customerName: string;
  totalPickups: number;
  totalKg: number;
  totalAmount: number;
  pendingCount: number;
  pendingKg: number;
  pendingAmount: number;
  paidCount: number;
  paidKg: number;
  paidAmount: number;
}

export interface PaidSettlementEntry {
  customerId: string;
  customerName: string;
  paidFromDate: string | null;
  paidToDate: string | null;
  totalPickups: number;
  totalKg: number;
  totalAmount: number;
}

// ---- Phase 2: Operations ----

export type EmployeeCategory = "sheet_machine" | "ovendry" | "khalla_jala" | "drivers_helpers";

export const EMPLOYEE_CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  sheet_machine: "Sheet Machine",
  ovendry: "Oven Dry",
  khalla_jala: "Khalla & Jala",
  drivers_helpers: "Drivers & Helpers",
};

export interface Employee {
  id: string;
  name: string;
  phone?: string | null;
  category: EmployeeCategory;
  monthlySalary: string;
  status: "active" | "inactive";
  createdAt: string;
}

export type SalaryPaymentType = "advance" | "salary";

export interface SalaryPayment {
  id: string;
  employeeId: string;
  type: SalaryPaymentType;
  amount: string;
  month: number;
  year: number;
  paymentDate: string;
  note?: string | null;
  employee?: { name: string; category: EmployeeCategory };
}

export interface SalarySummaryRow {
  employeeId: string;
  name: string;
  phone: string | null;
  category: EmployeeCategory;
  status: "active" | "inactive";
  monthlySalary: number;
  advanceTotal: number;
  salaryPaidTotal: number;
  totalPaid: number;
  remaining: number;
}

export interface SalaryMonthSummary {
  month: number;
  year: number;
  rows: SalarySummaryRow[];
  grandTotals: {
    monthlySalary: number;
    advanceTotal: number;
    salaryPaidTotal: number;
    remaining: number;
  };
}

export interface Vehicle {
  id: string;
  name: string;
  number: string;
  status: "active" | "inactive";
  createdAt: string;
}

export type TransportExpenseCategory = "diesel" | "repair";

export const TRANSPORT_CATEGORY_LABELS: Record<TransportExpenseCategory, string> = {
  diesel: "Diesel",
  repair: "Repair",
};

export interface TransportExpense {
  id: string;
  vehicleId: string;
  category: TransportExpenseCategory;
  amount: string;
  expenseDate: string;
  description?: string | null;
  vehicle?: { name: string; number: string };
}

export interface TransportSummary {
  dieselTotal: number;
  repairTotal: number;
  grandTotal: number;
  byVehicle: {
    vehicleId: string;
    vehicleName: string;
    vehicleNumber: string;
    dieselTotal: number;
    repairTotal: number;
    total: number;
  }[];
}

export type MaintenanceExpenseCategory = "food" | "machinery" | "others";

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceExpenseCategory, string> = {
  food: "Food",
  machinery: "Machinery",
  others: "Others",
};

export interface MaintenanceExpense {
  id: string;
  category: MaintenanceExpenseCategory;
  amount: string;
  expenseDate: string;
  description: string;
}

export interface MaintenanceSummary {
  foodTotal: number;
  machineryTotal: number;
  othersTotal: number;
  grandTotal: number;
}
