import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import type { Customer, Transaction } from "../../api/types";
import { inrCurrency } from "./dashboard/format";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function SettlementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const now = new Date();
  const [customerId, setCustomerId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "paid">("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    adminApi.listCustomers().then(setCustomers).catch(() => setError("Could not load customers."));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listSettlements()
      .then(setSettlements)
      .catch(() => setError("Could not load settlements. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return settlements.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (customerFilter && s.customerId !== customerFilter) return false;
      if (monthFilter && s.month !== Number(monthFilter)) return false;
      if (yearFilter && s.year !== Number(yearFilter)) return false;
      return true;
    });
  }, [settlements, statusFilter, customerFilter, monthFilter, yearFilter]);

  const years = useMemo(() => {
    const set = new Set<number>(settlements.map((s) => s.year));
    return [...set].sort((a, b) => b - a);
  }, [settlements]);

  const summary = useMemo(() => {
    const totalAmount = filtered.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalKg = filtered.reduce((sum, s) => sum + Number(s.totalKg || 0), 0);
    return { count: filtered.length, totalAmount, totalKg };
  }, [filtered]);

  async function refresh() {
    const list = await adminApi.listSettlements();
    setSettlements(list);
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!customerId) return;
    try {
      await adminApi.generateSettlement({ customer_id: customerId, month, year });
      setMessage(`Settlement generated successfully.`);
      await refresh();
    } catch {
      setError("Could not generate settlement (no unsettled pickups, or already settled for this month)");
    }
  }

  async function handleMarkPaid(id: string) {
    const paidDate = new Date().toISOString().slice(0, 10);
    try {
      await adminApi.markSettlementPaid(id, paidDate);
      await refresh();
    } catch {
      setError("Could not mark settlement as paid. Please try again.");
    }
  }

  const hasFilters = Boolean(statusFilter || customerFilter || monthFilter || yearFilter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Settlements</h1>
        <form onSubmit={handleGenerate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <select className="border border-gray-300 rounded px-2 py-1.5" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 font-medium">
            Generate settlement
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
      </div>

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
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="">All months</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                setStatusFilter("");
                setCustomerFilter("");
                setMonthFilter("");
                setYearFilter("");
              }}
              className="text-sm text-emerald-600 hover:underline"
            >
              Clear filters
            </button>
          )}
          <p className="text-sm text-gray-500 ml-auto">
            {summary.count} settlement{summary.count === 1 ? "" : "s"} · {inrCurrency(summary.totalAmount)} · {summary.totalKg} kg
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {loading ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Loading settlements…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              {hasFilters ? "No settlements match the selected filters." : "Generated settlements will appear here."}
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Month/Year</th>
                  <th className="px-4 py-2">Total kg</th>
                  <th className="px-4 py-2">Total amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Paid date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{s.customer?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {MONTH_NAMES[s.month - 1]} {s.year}
                    </td>
                    <td className="px-4 py-2">{Number(s.totalKg)} kg</td>
                    <td className="px-4 py-2">{inrCurrency(Number(s.totalAmount))}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{s.paidDate ? new Date(s.paidDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2">
                      {s.status === "pending" && (
                        <button onClick={() => handleMarkPaid(s.id)} className="text-emerald-600 hover:underline">
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
