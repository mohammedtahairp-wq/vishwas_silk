import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import type { Customer, Product, SettlementPreview, Transaction, TransactionLineItem } from "../../api/types";
import { inrCurrency } from "./dashboard/format";
import { Modal } from "../../components/Modal";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatPeriod(s: Transaction) {
  if (s.fromDate && s.toDate) {
    return `${formatDate(s.fromDate)} — ${formatDate(s.toDate)}`;
  }
  return `${MONTH_NAMES[s.month - 1]} ${s.year}`;
}

export function SettlementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [genCustomerId, setGenCustomerId] = useState("");
  const [genFromDate, setGenFromDate] = useState(firstOfMonth);
  const [genToDate, setGenToDate] = useState(today);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"" | "pending" | "paid">("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.listCustomers(),
      adminApi.listProducts(),
    ]).then(([c, p]) => { setCustomers(c); setProducts(p); })
      .catch(() => setError("Could not load customers or products."));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (customerFilter) params.customer_id = customerFilter;
    if (filterFromDate) params.from_date = filterFromDate;
    if (filterToDate) params.to_date = filterToDate;
    if (productFilter) params.product_id = productFilter;
    adminApi
      .listSettlements(params)
      .then(setSettlements)
      .catch(() => setError("Could not load settlements. Please try again."))
      .finally(() => setLoading(false));
  }, [statusFilter, customerFilter, filterFromDate, filterToDate, productFilter]);

  const summary = useMemo(() => {
    const totalAmount = settlements.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalKg = settlements.reduce((sum, s) => sum + Number(s.totalKg || 0), 0);
    return { count: settlements.length, totalAmount, totalKg };
  }, [settlements]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  async function handlePreview(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPreview(null);
    if (!genCustomerId || !genFromDate || !genToDate) return;
    setPreviewLoading(true);
    try {
      const result = await adminApi.previewSettlement({
        customer_id: genCustomerId,
        from_date: genFromDate,
        to_date: genToDate,
      });
      setPreview(result);
    } catch {
      setError("No unsettled pickups found for this customer in the selected date range.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmGenerate() {
    if (!preview) return;
    setGenerating(true);
    setError(null);
    try {
      await adminApi.generateSettlement({
        customer_id: preview.customerId,
        from_date: preview.fromDate,
        to_date: preview.toDate,
      });
      setMessage("Settlement generated successfully.");
      setPreview(null);
      const list = await adminApi.listSettlements();
      setSettlements(list);
    } catch {
      setError("Could not generate settlement. It may already exist for this period.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkPaid(id: string) {
    const paidDate = new Date().toISOString().slice(0, 10);
    try {
      await adminApi.markSettlementPaid(id, paidDate);
      const list = await adminApi.listSettlements();
      setSettlements(list);
    } catch {
      setError("Could not mark settlement as paid. Please try again.");
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
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Settlements</h1>
        <form onSubmit={handlePreview} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={genCustomerId} onChange={(e) => setGenCustomerId(e.target.value)} required>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
              <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={genFromDate} onChange={(e) => setGenFromDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
              <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={genToDate} onChange={(e) => setGenToDate(e.target.value)} required />
            </div>
            <button type="submit" disabled={previewLoading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded px-4 py-1.5 font-medium text-sm">
              {previewLoading ? "Loading preview..." : "Preview settlement"}
            </button>
          </div>
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
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} placeholder="From" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} placeholder="To" />
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
            {summary.count} settlement{summary.count === 1 ? "" : "s"} · {inrCurrency(summary.totalAmount)} · {summary.totalKg.toFixed(1)} kg
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          {loading ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Loading settlements...</p>
          ) : settlements.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              {hasFilters ? "No settlements match the selected filters." : "Generated settlements will appear here."}
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2 text-right">Total kg</th>
                  <th className="px-4 py-2 text-right">Total amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Paid date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <SettlementRow
                    key={s.id}
                    settlement={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    onMarkPaid={handleMarkPaid}
                    productMap={productMap}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {preview && (
        <Modal title="Settlement Preview" onClose={() => setPreview(null)}>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><span className="font-medium text-gray-900">Customer:</span> {customers.find((c) => c.id === preview.customerId)?.name ?? "—"}</p>
              <p><span className="font-medium text-gray-900">Period:</span> {formatDate(preview.fromDate)} — {formatDate(preview.toDate)}</p>
              <p><span className="font-medium text-gray-900">Total pickups:</span> {preview.pickupsCount}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Pickups</th>
                    <th className="px-3 py-2 text-right">Total kg</th>
                    <th className="px-3 py-2 text-right">Avg price/kg</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lineItems.map((item) => (
                    <tr key={item.productId} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.count}</td>
                      <td className="px-3 py-2 text-right">{item.totalKg.toFixed(2)} kg</td>
                      <td className="px-3 py-2 text-right">{inrCurrency(item.pricePerKg)}</td>
                      <td className="px-3 py-2 text-right font-medium">{inrCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{preview.pickupsCount}</td>
                    <td className="px-3 py-2 text-right">{preview.totalKg.toFixed(2)} kg</td>
                    <td className="px-3 py-2 text-right">
                      {preview.totalKg > 0 ? inrCurrency(Number((preview.totalAmount / preview.totalKg).toFixed(2))) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{inrCurrency(preview.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={handleConfirmGenerate} disabled={generating} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50">
                {generating ? "Generating..." : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SettlementRow({
  settlement: s,
  expanded,
  onToggle,
  onMarkPaid,
  productMap,
}: {
  settlement: Transaction;
  expanded: boolean;
  onToggle: () => void;
  onMarkPaid: (id: string) => void;
  productMap: Map<string, Product>;
}) {
  return (
    <>
      <tr className="border-t border-gray-100">
        <td className="px-4 py-2 font-medium text-gray-900">{s.customer?.name ?? "—"}</td>
        <td className="px-4 py-2">
          <div className="text-sm">{formatPeriod(s)}</div>
          {s.fromDate && s.toDate && (
            <button onClick={onToggle} className="text-xs text-emerald-600 hover:underline mt-0.5">
              {expanded ? "Hide details" : "View line items"}
            </button>
          )}
        </td>
        <td className="px-4 py-2 text-right">{Number(s.totalKg).toFixed(2)} kg</td>
        <td className="px-4 py-2 text-right font-medium">{inrCurrency(Number(s.totalAmount))}</td>
        <td className="px-4 py-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
            {s.status}
          </span>
        </td>
        <td className="px-4 py-2 text-sm">
          {s.paidDate ? formatDate(s.paidDate) : "—"}
          {s.status === "paid" && s.fromDate && s.toDate && (
            <div className="text-xs text-gray-400 mt-0.5">{formatDate(s.fromDate)} — {formatDate(s.toDate)}</div>
          )}
        </td>
        <td className="px-4 py-2">
          {s.status === "pending" && (
            <button onClick={() => onMarkPaid(s.id)} className="text-emerald-600 hover:underline text-sm">
              Mark paid
            </button>
          )}
        </td>
      </tr>
      {expanded && s.lineItems && s.lineItems.length > 0 && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-4 py-3">
            <table className="min-w-full text-xs">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-1">Product</th>
                  <th className="px-3 py-1 text-right">Total kg</th>
                  <th className="px-3 py-1 text-right">Price/kg</th>
                  <th className="px-3 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.lineItems.map((li: TransactionLineItem) => (
                  <tr key={li.id} className="border-t border-gray-200">
                    <td className="px-3 py-1">{li.product?.name ?? productMap.get(li.productId)?.name ?? "—"}</td>
                    <td className="px-3 py-1 text-right">{Number(li.totalKg).toFixed(2)} kg</td>
                    <td className="px-3 py-1 text-right">{inrCurrency(Number(li.pricePerKg))}</td>
                    <td className="px-3 py-1 text-right font-medium">{inrCurrency(Number(li.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
