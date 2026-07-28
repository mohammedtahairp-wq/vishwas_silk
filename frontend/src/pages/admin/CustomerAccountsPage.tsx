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

export function CustomerAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const city = searchParams.get("city") ?? "";
  const from = searchParams.get("from") ?? localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = searchParams.get("to") ?? localDate(new Date());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([adminApi.listCustomers(), adminApi.listPickups({ from, to })])
      .then(([customerRows, pickupRows]) => {
        setCustomers(customerRows);
        setPickups(pickupRows);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load customer accounts.")))
      .finally(() => setLoading(false));
  }, [from, to]);

  const cities = useMemo(
    () => [...new Set(customers.map((customer) => customer.villageArea?.trim() || "Unspecified"))].sort(),
    [customers],
  );

  const rows = useMemo(() => {
    const amountByCustomer = new Map<string, number>();
    for (const pickup of pickups) {
      amountByCustomer.set(pickup.customerId, (amountByCustomer.get(pickup.customerId) ?? 0) + Number(pickup.amount || 0));
    }
    return customers
      .filter((customer) => !city || (customer.villageArea?.trim() || "Unspecified") === city)
      .map((customer) => ({ customer, amount: amountByCustomer.get(customer.id) ?? 0 }))
      .sort((a, b) => b.amount - a.amount || a.customer.name.localeCompare(b.customer.name));
  }, [customers, pickups, city]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  function updateFilter(key: "city" | "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
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
          <Link to="/admin" className="text-sm text-indigo-600 hover:underline">← Back to dashboard</Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Customer Accounts</h1>
          <p className="text-sm text-gray-500">Customer collection amounts without profile-management details.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
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
              <tr key={customer.id} className="border-t border-gray-100 hover:bg-indigo-50/40">
                <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{customer.serialNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link to={historyLink(customer.id)} className="font-medium text-indigo-600 hover:underline">
                    {customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={historyLink(customer.id)} className="font-semibold text-indigo-600 hover:underline">
                    {money(amount)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-indigo-600 bg-indigo-50 font-semibold">
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
