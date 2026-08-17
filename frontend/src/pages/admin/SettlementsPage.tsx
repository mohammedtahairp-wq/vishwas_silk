import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.api";
import type { City, Customer, Product, SettlementSummary } from "../../api/types";
import { inrCurrency } from "./dashboard/format";

function toLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthStart() {
  const d = new Date();
  return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function today() {
  return toLocalDate(new Date());
}

export function SettlementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [summary, setSummary] = useState<SettlementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [customerFilter, setCustomerFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [settling, setSettling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.listCustomers(), adminApi.listProducts(), adminApi.listCities()])
      .then(([c, p, ci]) => { setCustomers(c); setProducts(p); setCities(ci); })
      .catch(() => setError("Could not load data."));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [fromDate, toDate, customerFilter, productFilter, cityFilter]);

  const filteredCustomers = useMemo(() => {
    if (!cityFilter) return customers;
    const city = cities.find((c) => c.id === cityFilter);
    if (!city) return [];
    return customers.filter((c) => c.villageArea === city.name);
  }, [customers, cityFilter, cities]);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (customerFilter) params.customer_id = customerFilter;
    if (productFilter) params.product_id = productFilter;
    if (cityFilter) params.city_id = cityFilter;
    try {
      const data = await adminApi.settlementsSummary(params);
      setSummary(data);
    } catch {
      setError("Could not load settlements.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid(customerId: string) {
    if (!fromDate || !toDate) return;
    setSettling(customerId);
    setError(null);
    setMessage(null);
    try {
      const result = await adminApi.markBulkPaid({
        customer_id: customerId,
        from_date: fromDate,
        to_date: toDate,
      });
      setMessage(`${result.updatedCount} entries marked as paid.`);
      await loadSummary();
    } catch {
      setError("Could not mark as paid.");
    } finally {
      setSettling(null);
    }
  }

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, s) => ({
        count: acc.count + s.totalPickups,
        totalKg: acc.totalKg + s.totalKg,
        totalAmount: acc.totalAmount + s.totalAmount,
        pendingAmount: acc.pendingAmount + s.pendingAmount,
        paidAmount: acc.paidAmount + s.paidAmount,
      }),
      { count: 0, totalKg: 0, totalAmount: 0, pendingAmount: 0, paidAmount: 0 }
    );
  }, [summary]);

  const hasFilters = Boolean(customerFilter || productFilter || cityFilter || fromDate !== monthStart() || toDate !== today());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Settlements</h1>
        <p className="text-sm text-gray-500">Customer-wise summary. Mark paid to settle all entries for a customer in the selected period.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">From</label>
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">To</label>
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="">All customers</option>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">City</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setCustomerFilter(""); }}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product</label>
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFromDate(monthStart()); setToDate(today()); setCustomerFilter(""); setProductFilter(""); setCityFilter(""); }}
              className="text-sm text-emerald-600 hover:underline pb-1.5"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total entries</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total amount</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{inrCurrency(totals.totalAmount)}</p>
          <p className="text-xs text-gray-400">{totals.totalKg.toFixed(1)} kg</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{inrCurrency(totals.pendingAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Paid</p>
          <p className="mt-1 text-xl font-bold text-green-600">{inrCurrency(totals.paidAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">Loading...</p>
        ) : summary.length === 0 ? (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">No entries found for this period.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2 text-right">Pickups</th>
                <th className="px-4 py-2 text-right">Total kg</th>
                <th className="px-4 py-2 text-right">Total amount</th>
                <th className="px-4 py-2 text-right">Pending</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.customerId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.customerName}</td>
                  <td className="px-4 py-3 text-right">{s.totalPickups}</td>
                  <td className="px-4 py-3 text-right">{s.totalKg.toFixed(2)} kg</td>
                  <td className="px-4 py-3 text-right font-medium">{inrCurrency(s.totalAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.pendingAmount > 0 ? (
                      <span className="text-amber-600 font-medium">{inrCurrency(s.pendingAmount)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.paidAmount > 0 ? (
                      <span className="text-green-600">{inrCurrency(s.paidAmount)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.pendingAmount > 0 && (
                      <button
                        onClick={() => handleMarkPaid(s.customerId)}
                        disabled={settling === s.customerId}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium rounded px-3 py-1.5"
                      >
                        {settling === s.customerId ? "Settling..." : "Mark paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {summary.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-semibold">
                  <td className="px-4 py-2">TOTAL</td>
                  <td className="px-4 py-2 text-right">{totals.count}</td>
                  <td className="px-4 py-2 text-right">{totals.totalKg.toFixed(2)} kg</td>
                  <td className="px-4 py-2 text-right">{inrCurrency(totals.totalAmount)}</td>
                  <td className="px-4 py-2 text-right text-amber-600">{inrCurrency(totals.pendingAmount)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{inrCurrency(totals.paidAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
