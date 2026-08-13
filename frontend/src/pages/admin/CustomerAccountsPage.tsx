import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Customer, PickupAdmin } from "../../api/types";

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const money = (value: number) =>
  value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const printDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN");

function buildAccountsPrintHtml(rows: { customer: Customer; amount: number }[], total: number, city: string, from: string, to: string) {
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const bodyRows = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.customer.serialNumber ?? "—")}</td>
        <td>${escapeHtml(row.customer.name)}</td>
        <td>${escapeHtml(row.customer.phone)}</td>
        <td class="num">${money(row.amount)}</td>
      </tr>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Customer Accounts</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; }
  .report-header { background: #065f46; color: #fff; padding: 16px 22px; }
  .report-header h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }
  .report-header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
  .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; padding: 10px 22px; background: #f3f4f6; font-size: 12px; }
  table { width: calc(100% - 44px); margin: 16px 22px 0; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: left; }
  th { background: #065f46; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  tr.total td { background: #d1fae5; font-weight: 700; }
  .footer { margin: 16px 22px; font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
  <div class="report-header">
    <h1>VISHWAS SILK — Customer Accounts</h1>
    <p>Generated on ${escapeHtml(generatedAt)}</p>
  </div>
  <div class="meta">
    <span><strong>Period:</strong> ${printDate(from)} – ${printDate(to)}</span>
    <span><strong>City:</strong> ${escapeHtml(city || "All cities")}</span>
    <span><strong>Customers:</strong> ${rows.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:14%">Serial No</th>
        <th>Customer name</th>
        <th style="width:18%">Phone number</th>
        <th class="num" style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr class="total">
        <td colspan="2">TOTAL · ${rows.length} customers</td>
        <td></td>
        <td class="num">${money(total)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">Printed from VISHWAS SILK · https://manage.vishwassilk.com</p>
</body>
</html>`;
}

export function CustomerAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city") ?? "";
  const from = searchParams.get("from") ?? localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = searchParams.get("to") ?? localDate(new Date());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.listCustomers(), adminApi.listPickups({ from, to }), adminApi.listCities()])
      .then(([customerRows, pickupRows, cityRows]) => {
        setCustomers(customerRows);
        setPickups(pickupRows);
        setCities(cityRows.map((row) => row.name).sort((a, b) => a.localeCompare(b)));
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load customer accounts.")))
      .finally(() => setLoading(false));
  }, [from, to]);

  const rows = useMemo(() => {
    const amountByCustomer = new Map<string, number>();
    for (const pickup of pickups) {
      amountByCustomer.set(pickup.customerId, (amountByCustomer.get(pickup.customerId) ?? 0) + Number(pickup.amount || 0));
    }
    const q = search.trim().toLowerCase();
    return customers
      .filter((customer) => !city || (customer.villageArea?.trim() || "Unspecified") === city)
      .filter((customer) => !q || customer.name.toLowerCase().includes(q) || customer.serialNumber?.toLowerCase().includes(q))
      .map((customer) => ({ customer, amount: amountByCustomer.get(customer.id) ?? 0 }))
      .sort((a, b) => b.amount - a.amount || a.customer.name.localeCompare(b.customer.name));
  }, [customers, pickups, city, search]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  function updateFilter(key: "city" | "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function handlePrint() {
    const html = buildAccountsPrintHtml(rows, total, city, from, to);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { setError("Pop-ups are blocked. Allow pop-ups for this site to print."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => { win.print(); };
  }

  const historyLink = (customerId: string) => {
    const params = new URLSearchParams({ from, to });
    if (city) params.set("city", city);
    return `/admin/customer-accounts/${customerId}?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin" className="text-sm text-emerald-600 hover:underline">← Back to dashboard</Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Customer Accounts</h1>
          <p className="text-sm text-gray-500">Customer collection amounts without profile-management details.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Filter label="Search">
            <input type="text" placeholder="Name or serial" value={search} onChange={(e) => setSearch(e.target.value)} className="filter-input" />
          </Filter>
          <Filter label="City">
            <select value={city} onChange={(e) => updateFilter("city", e.target.value)} className="filter-input">
              <option value="">All cities</option>
              {cities.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </Filter>
          <Filter label="From">
            <input type="date" value={from} max={to} onChange={(e) => updateFilter("from", e.target.value)} className="filter-input" />
          </Filter>
          <Filter label="To">
            <input type="date" value={to} min={from} onChange={(e) => updateFilter("to", e.target.value)} className="filter-input" />
          </Filter>
          <button
            onClick={handlePrint}
            disabled={loading || rows.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
          >
            Print
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Serial No</th>
              <th className="px-4 py-3">Customer name</th>
              <th className="px-4 py-3">Phone number</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Empty text="Loading customer accounts..." />
            ) : rows.length === 0 ? (
              <Empty text="No customers found for this selection." />
            ) : rows.map(({ customer, amount }) => (
              <tr key={customer.id} className="border-t border-gray-100 hover:bg-emerald-50/40">
                <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{customer.serialNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link to={historyLink(customer.id)} className="font-medium text-emerald-600 hover:underline">
                    {customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={historyLink(customer.id)} className="font-semibold text-emerald-600 hover:underline">
                    {money(amount)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-semibold">
                <td className="px-4 py-3" colSpan={3}>TOTAL · {rows.length} customers</td>
                <td className="px-4 py-3 text-right">{money(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">{label}{children}</label>;
}

function Empty({ text }: { text: string }) {
  return <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
