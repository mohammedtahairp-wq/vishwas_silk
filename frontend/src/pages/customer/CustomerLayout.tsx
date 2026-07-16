import { PortalLayout } from "../../components/PortalLayout";

const navItems = [
  { to: "/customer/profile", label: "My Profile" },
  { to: "/customer/pickups", label: "My Pickups" },
  { to: "/customer/transactions", label: "Transaction History" },
];

export function CustomerLayout() {
  return <PortalLayout title="VISHWAS SILK" navItems={navItems} />;
}
