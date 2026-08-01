import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { UpdateBanner } from "./components/UpdateBanner";

import { AdminLayout } from "./pages/admin/AdminLayout";
import { DashboardHome } from "./pages/admin/DashboardHome";
import { CustomersListPage } from "./pages/admin/CustomersListPage";
import { CustomerDetailPage } from "./pages/admin/CustomerDetailPage";
import { CitiesPage } from "./pages/admin/CitiesPage";
import { RidersListPage } from "./pages/admin/RidersListPage";
import { RiderDetailPage } from "./pages/admin/RiderDetailPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { PricingPage } from "./pages/admin/PricingPage";
import { PickupsPage } from "./pages/admin/PickupsPage";
import { AdminLogPickupPage } from "./pages/admin/LogPickupPage";
import { SettlementsPage } from "./pages/admin/SettlementsPage";
import { GrandTotalPage } from "./pages/admin/GrandTotalPage";
import { CustomerAccountsPage } from "./pages/admin/CustomerAccountsPage";
import { CustomerProductHistoryPage } from "./pages/admin/CustomerProductHistoryPage";

import { RiderLayout } from "./pages/rider/RiderLayout";
import { MyCustomersPage } from "./pages/rider/MyCustomersPage";
import { LogPickupPage } from "./pages/rider/LogPickupPage";
import { MyPickupHistoryPage } from "./pages/rider/MyPickupHistoryPage";

import { CustomerLayout } from "./pages/customer/CustomerLayout";
import { MyProfilePage } from "./pages/customer/MyProfilePage";
import { MyPickupsPage } from "./pages/customer/MyPickupsPage";
import { TransactionHistoryPage } from "./pages/customer/TransactionHistoryPage";

function HomeRedirect() {
  const { token, role } = useAuth();
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <HashRouter>
      <UpdateBanner />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allow={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="customers" element={<CustomersListPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="customer-accounts" element={<CustomerAccountsPage />} />
              <Route path="customer-accounts/:id" element={<CustomerProductHistoryPage />} />
              <Route path="riders" element={<RidersListPage />} />
              <Route path="riders/:id" element={<RiderDetailPage />} />
              <Route path="cities" element={<CitiesPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="pickups" element={<PickupsPage />} />
              <Route path="log-pickup" element={<AdminLogPickupPage />} />
              <Route path="grand-total" element={<GrandTotalPage />} />
              <Route path="settlements" element={<SettlementsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={["rider"]} />}>
            <Route path="/rider" element={<RiderLayout />}>
              <Route index element={<Navigate to="customers" replace />} />
              <Route path="customers" element={<MyCustomersPage />} />
              <Route path="log-pickup" element={<LogPickupPage />} />
              <Route path="history" element={<MyPickupHistoryPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={["customer"]} />}>
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<MyProfilePage />} />
              <Route path="pickups" element={<MyPickupsPage />} />
              <Route path="transactions" element={<TransactionHistoryPage />} />
            </Route>
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
