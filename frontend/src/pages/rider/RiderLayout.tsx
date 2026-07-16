import { PortalLayout } from "../../components/PortalLayout";

const navItems = [
  { to: "/rider/customers", label: "My Customers" },
  { to: "/rider/log-pickup", label: "Log Pickup" },
  { to: "/rider/history", label: "Customer Product History" },
];

export function RiderLayout() {
  return <PortalLayout title="Rider — VISHWAS SILK" navItems={navItems} />;
}
