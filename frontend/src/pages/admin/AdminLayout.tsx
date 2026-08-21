import { PortalLayout } from "../../components/PortalLayout";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/customer-accounts", label: "Customer Accounts" },
  { to: "/admin/riders", label: "Riders" },
  { to: "/admin/cities", label: "Cities" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/pricing", label: "Pricing" },
  { to: "/admin/log-pickup", label: "Log Pickup" },
  { to: "/admin/pickups", label: "Pickups" },
  { to: "/admin/grand-total", label: "Grand Total" },
  { to: "/admin/settlements", label: "Settlements" },
  { to: "/admin/operations", label: "Operations" },
];

export function AdminLayout() {
  return <PortalLayout title="Admin — VISHWAS SILK" navItems={navItems} />;
}
