import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.api";
import type { Customer, PickupAdmin, Product } from "../../api/types";
import { inrCurrency } from "./dashboard/format";

export function SettlementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "paid">("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [productFilter, setProductFilter] = useState("");

  useEffect(() => {
    Promise.all([
      adminApi.listCustomers(),
      adminApi.listProducts(),
    ]).then(([c, p]) => { setCustomers(c); setProducts(p); })
      .catch(() => setError("Could not load data."));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (customerFilter) params.customer_id = customerFilter;
    if (filterFromDate) params.from = filterFromDate;
    if (filterToDate) params.to = filterToDate;
    if (productFilter) params.product_id = productFilter;
    adminApi
      .listPickups(params)
      .then(setPickups)
      .catch(() => setError("Could not load settlements. Please try again."))
      .finally(() => setLoading(false));
  }, [statusFilter, customerFilter, filterFromDate, filterToDate, productFilter]);

  const summary = useMemo(() => {
    const totalAmount = pickups.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalKg = pickups.reduce((sum, p) => sum + Number(p.kg || 0), 0);
    return { count: pickups.length, totalAmount, totalKg };
  }, [pickups]);

  async function handleMarkPaid(id: string) {
    const paidDate = new Date().toISOString().slice(0, 10);
    try {
      await adminApi.markPickupPaid(id, paidDate);
      setPickups((prev) => prev.map((p) => p.id === id ? { ...p, status: "paid" } : p));
    } catch {
      setError("Could not mark as paid. Please try again.");
    }
  }

  const hasFilters = Boolean(statusFilter || customerFilter || filterFromDate || filterToDate || productFilter);

  function clearFilters() {
    setStatusFilter("");
    setCustomerFilter("");
    setFilterFromDate("");
    setFilterToDate("");
    setProductFilter("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settlements</h1>
        <p className="text-sm text-gray-500">All product entries are pending settlements until marked as paid.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {(["", "pending", "paid"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${statusFilter === status ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {status === "" ? "All" : status === "pending" ? "Pending" : "Paid"}
              </button>
            ))}
          </div>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
          </div>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-emerald-600 hover:underline">
              Clear filters
            </button>
          )}
          <p className="text-sm text-gray-500 ml-auto">
            {summary.count} entr{summary.count === 1 ? "y" : "ies"} · {inrCurrency(summary.totalAmount)} · {summary.totalKg.toFixed(1)} kg
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {loading ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Loading settlements...</p>
          ) : pickups.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              {hasFilters ? "No entries match the selected filters." : "No product entries yet."}
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Rider</th>
                  <th className="px-4 py-2 text-right">Qty (kg)</th>
                  <th className="px-4 py-2 text-right">Price/kg</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pickups.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{p.customer?.name ?? "—"}</td>
                    <td className="px-4 py-2">{new Date(p.pickupDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-2">{p.product?.name ?? "—"}</td>
                    <td className="px-4 py-2">{p.rider?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{Number(p.kg).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{inrCurrency(Number(p.pricePerKgSnapshot))}</td>
                    <td className="px-4 py-2 text-right font-medium">{inrCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {p.status === "pending" ? "Pending" : p.status === "paid" ? "Paid" : p.status === "included_in_settlement" ? "Settled" : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {p.status === "pending" && (
                        <button onClick={() => handleMarkPaid(p.id)} className="text-emerald-600 hover:underline text-sm">
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {pickups.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-semibold">
                    <td colSpan={4} className="px-4 py-2">TOTAL</td>
                    <td className="px-4 py-2 text-right">{summary.totalKg.toFixed(2)} kg</td>
                    <td></td>
                    <td className="px-4 py-2 text-right">{inrCurrency(summary.totalAmount)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
