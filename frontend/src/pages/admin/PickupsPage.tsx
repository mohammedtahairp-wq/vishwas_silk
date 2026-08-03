import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { City, Customer, PickupAdmin, Product, Rider } from "../../api/types";

type Period = "daily" | "weekly" | "monthly";
type ViewMode = "report" | "list";

interface ReportRow {
  customerId: string;
  customerName: string;
  values: Record<string, { kg: number; amount: number }>;
  totalKg: number;
  totalAmount: number;
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function reportRange(period: Period, value: string) {
  const selected = new Date(`${value}T00:00:00`);
  const from = new Date(selected);
  const to = new Date(selected);

  if (period === "weekly") {
    const dayFromMonday = (selected.getDay() + 6) % 7;
    from.setDate(selected.getDate() - dayFromMonday);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
  } else if (period === "monthly") {
    from.setDate(1);
    to.setMonth(from.getMonth() + 1, 0);
  }

  return { from: localDateValue(from), to: localDateValue(to) };
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function number(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function money(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function PickupsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("report");
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPickup, setEditingPickup] = useState<PickupAdmin | null>(null);
  const [deletingPickup, setDeletingPickup] = useState<PickupAdmin | null>(null);

  const range = useMemo(() => reportRange(period, selectedDate), [period, selectedDate]);

  const fetchCommon = () => Promise.all([adminApi.listCities(), adminApi.listProducts()]).then(([cityRows, productRows]) => {
    setCities(cityRows);
    setProducts(productRows);
  });

  useEffect(() => { fetchCommon(); }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    adminApi
      .listPickups({ from: range.from, to: range.to })
      .then((rows) => current && setPickups(rows))
      .catch((err) => current && setError(apiErrorMessage(err, "Could not load the report.")))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [range.from, range.to]);

  const reportRows = useMemo(() => {
    const rows = new Map<string, ReportRow>();
    for (const pickup of pickups) {
      if (city && pickup.customer?.villageArea !== city) continue;
      const row = rows.get(pickup.customerId) ?? {
        customerId: pickup.customerId,
        customerName: pickup.customer?.name ?? "Unknown customer",
        values: {},
        totalKg: 0,
        totalAmount: 0,
      };
      const kg = Number(pickup.kg);
      const amount = Number(pickup.amount);
      const productValue = row.values[pickup.productId] ?? { kg: 0, amount: 0 };
      productValue.kg += kg;
      productValue.amount += amount;
      row.values[pickup.productId] = productValue;
      row.totalKg += kg;
      row.totalAmount += amount;
      rows.set(pickup.customerId, row);
    }
    return [...rows.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [pickups, city]);

  const visibleProducts = useMemo(
    () => products.filter((product) => reportRows.some((row) => row.values[product.id])),
    [products, reportRows]
  );

  const title = period === "daily" ? displayDate(range.from) : `${displayDate(range.from)} – ${displayDate(range.to)}`;

  function handleEdit(pickup: PickupAdmin) {
    setEditingPickup(pickup);
  }

  function handleDelete(pickup: PickupAdmin) {
    setDeletingPickup(pickup);
  }

  async function confirmDelete() {
    if (!deletingPickup) return;
    try {
      await adminApi.deletePickup(deletingPickup.id);
      setDeletingPickup(null);
      const rows = await adminApi.listPickups({ from: range.from, to: range.to });
      setPickups(rows);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete pickup."));
      setDeletingPickup(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {viewMode === "report" ? "City-wise Customer Report" : "All Pickups"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {viewMode === "report" ? "Product quantities and amounts collected from each customer." : "View and edit individual pickup records."}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          <button onClick={() => setViewMode("report")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "report" ? "bg-emerald-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>Report</button>
          <button onClick={() => setViewMode("list")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "list" ? "bg-emerald-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>All Pickups</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        {viewMode === "report" && (
          <label className="text-xs font-medium text-gray-600">
            City
            <select className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs font-medium text-gray-600">
          Report period
          <select className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          {period === "daily" ? "Date" : period === "weekly" ? "Any date in week" : "Any date in month"}
          <input type="date" className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {viewMode === "report" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">{city || "All cities"}</p>
              <p className="text-sm text-gray-500">{title}</p>
            </div>
            <p className="text-sm text-gray-500">{reportRows.length} customer{reportRows.length === 1 ? "" : "s"}</p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full whitespace-nowrap text-sm">
              <thead className="bg-emerald-700 text-left text-white">
                <tr>
                  <th rowSpan={2} className="border-r border-emerald-500 px-3 py-2">Customer</th>
                  {visibleProducts.map((product) => (
                    <th key={product.id} colSpan={2} className="border-r border-emerald-500 px-3 py-2 text-center">{product.name}</th>
                  ))}
                  <th colSpan={2} className="px-3 py-2 text-center">Total</th>
                </tr>
                <tr className="bg-emerald-600 text-xs">
                  {visibleProducts.map((product) => (
                    <FragmentColumns key={product.id} />
                  ))}
                  <th className="px-3 py-2 text-right">Kg</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3 + visibleProducts.length * 2} className="px-4 py-8 text-center text-gray-400">Loading report...</td></tr>
                ) : reportRows.length === 0 ? (
                  <tr><td colSpan={3 + visibleProducts.length * 2} className="px-4 py-8 text-center text-gray-400">No pickups found for this city and period.</td></tr>
                ) : reportRows.map((row) => (
                  <tr key={row.customerId} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="border-r border-gray-200 px-3 py-2 font-medium text-gray-900">{row.customerName}</td>
                    {visibleProducts.map((product) => (
                      <ProductColumns key={product.id} kg={row.values[product.id]?.kg ?? 0} amount={row.values[product.id]?.amount ?? 0} />
                    ))}
                    <td className="bg-gray-50 px-3 py-2 text-right font-medium">{number(row.totalKg)}</td>
                    <td className="bg-gray-50 px-3 py-2 text-right font-medium">{money(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full whitespace-nowrap text-sm">
            <thead className="bg-emerald-700 text-left text-white">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Rider</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Kg</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading pickups...</td></tr>
              ) : pickups.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No pickups found for this period.</td></tr>
              ) : pickups.map((pickup) => (
                <tr key={pickup.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{new Date(pickup.pickupDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{pickup.customer?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{pickup.rider?.name ?? "—"}</td>
                  <td className="px-3 py-2">{pickup.product?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{number(Number(pickup.kg))}</td>
                  <td className="px-3 py-2 text-right">{money(Number(pickup.amount))}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pickup.status === "pending" ? "bg-yellow-100 text-yellow-800" : pickup.status === "included_in_settlement" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                      {pickup.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {pickup.status === "pending" && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleEdit(pickup)} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Edit</button>
                        <button onClick={() => handleDelete(pickup)} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPickup && (
        <EditPickupModal
          pickup={editingPickup}
          products={products}
          onClose={() => setEditingPickup(null)}
          onSaved={() => {
            setEditingPickup(null);
            adminApi.listPickups({ from: range.from, to: range.to }).then(setPickups);
          }}
        />
      )}

      {deletingPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingPickup(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Delete pickup?</h2>
            <p className="mt-1 text-sm text-gray-500">
              This will permanently remove the {Number(deletingPickup.kg)} kg {deletingPickup.product?.name ?? "product"} pickup for {deletingPickup.customer?.name ?? "this customer"}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeletingPickup(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentColumns() {
  return <><th className="px-3 py-2 text-right">Kg</th><th className="border-r border-emerald-500 px-3 py-2 text-right">Amount</th></>;
}

function ProductColumns({ kg, amount }: { kg: number; amount: number }) {
  return <><td className="px-3 py-2 text-right">{number(kg)}</td><td className="border-r border-gray-200 px-3 py-2 text-right">{money(amount)}</td></>;
}

interface EditPickupModalProps {
  pickup: PickupAdmin;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

function EditPickupModal({ pickup, products: allProducts, onClose, onSaved }: EditPickupModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [customerSearch, setCustomerSearch] = useState(pickup.customer?.name ?? "");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(pickup.customer ?? null);
  const [selectedRiderId, setSelectedRiderId] = useState(pickup.riderId);
  const [selectedProductId, setSelectedProductId] = useState(pickup.productId);
  const [kg, setKg] = useState(pickup.kg);
  const [pickupDate, setPickupDate] = useState(pickup.pickupDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([adminApi.listCustomers(), adminApi.listRiders()]).then(([customerRows, riderRows]) => {
      const activeCustomers = customerRows.filter((c) => c.status === "active");
      setCustomers(activeCustomers);
      setFilteredCustomers(activeCustomers);
      setRiders(riderRows.filter((r) => r.status === "active"));
    });
  }, []);

  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomers(customers);
    } else {
      const q = customerSearch.trim().toLowerCase();
      setFilteredCustomers(
        customers.filter((c) =>
          [c.serialNumber, c.name, c.phone, c.villageArea]
            .some((v) => v?.toLowerCase().includes(q))
        )
      );
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !selectedRiderId) {
      setError("Select a customer and a rider.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.updatePickup(pickup.id, {
        customer_id: selectedCustomer.id,
        rider_id: selectedRiderId,
        product_id: selectedProductId,
        kg: Number(kg),
        pickup_date: pickupDate,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not update pickup."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">Edit Pickup</h2>
        <p className="mt-1 text-sm text-gray-500">Update pickup record #{pickup.id.slice(0, 8)}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-gray-600">
            Customer
            <div ref={dropdownRef} className="relative mt-1">
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Search customer..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowDropdown(true);
                  setSelectedCustomer(null);
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
              />
              {showDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 max-h-48 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-emerald-50 ${selectedCustomer?.id === c.id ? "bg-emerald-50 font-semibold" : ""}`}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.serialNumber ? `${c.serialNumber} - ${c.name}` : c.name);
                        setShowDropdown(false);
                      }}
                    >
                      <span className="text-gray-900">{c.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{c.serialNumber ?? ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <label className="block text-xs font-medium text-gray-600">
            Rider
            <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={selectedRiderId} onChange={(e) => setSelectedRiderId(e.target.value)}>
              <option value="">Select rider...</option>
              {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <label className="block text-xs font-medium text-gray-600">
            Product
            <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Select product...</option>
              {allProducts.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-gray-600">
              Kg
              <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={kg} onChange={(e) => setKg(e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Date
              <input type="date" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </label>
          </div>

          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
