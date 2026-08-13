import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Customer, PickupAdmin, Product } from "../../api/types";

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const money = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const number = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function CustomerProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") ?? localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = searchParams.get("to") ?? localDate(new Date());
  const city = searchParams.get("city") ?? "";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.getCustomer(id),
      adminApi.listPickups({ customer_id: id, from, to }),
      adminApi.listProducts(),
    ])
      .then(([customerRow, pickupRows, productRows]) => {
        setCustomer(customerRow);
        setPickups(pickupRows);
        setProducts(productRows);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load product history.")))
      .finally(() => setLoading(false));
  }, [id, from, to]);

  const totals = useMemo(() => ({
    kg: pickups.reduce((sum, pickup) => sum + Number(pickup.kg), 0),
    amount: pickups.reduce((sum, pickup) => sum + Number(pickup.amount), 0),
  }), [pickups]);

  const productTotals = useMemo(() => {
    const result = new Map<string, { kg: number; amount: number }>();
    for (const product of products) result.set(product.id, { kg: 0, amount: 0 });
    for (const pickup of pickups) {
      const value = result.get(pickup.productId) ?? { kg: 0, amount: 0 };
      value.kg += Number(pickup.kg);
      value.amount += Number(pickup.amount);
      result.set(pickup.productId, value);
    }
    return result;
  }, [pickups, products]);

  const activeProducts = useMemo(
    () => products.filter((product) => {
      const value = productTotals.get(product.id);
      return value != null && (value.kg !== 0 || value.amount !== 0);
    }),
    [products, productTotals],
  );

  const dateRows = useMemo(() => {
    const grouped = new Map<string, Map<string, { kg: number; amount: number }>>();
    for (const pickup of pickups) {
      const date = pickup.pickupDate.slice(0, 10);
      const byProduct = grouped.get(date) ?? new Map<string, { kg: number; amount: number }>();
      const value = byProduct.get(pickup.productId) ?? { kg: 0, amount: 0 };
      value.kg += Number(pickup.kg);
      value.amount += Number(pickup.amount);
      byProduct.set(pickup.productId, value);
      grouped.set(date, byProduct);
    }
    return [...grouped.entries()]
      .map(([date, byProduct]) => ({
        date,
        byProduct,
        kg: [...byProduct.values()].reduce((sum, value) => sum + value.kg, 0),
        amount: [...byProduct.values()].reduce((sum, value) => sum + value.amount, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pickups]);

  function updateDate(key: "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  const backParams = new URLSearchParams({ from, to });
  if (city) backParams.set("city", city);
  const columnCount = activeProducts.length + 3;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to={`/admin/customer-accounts?${backParams.toString()}`} className="text-sm text-emerald-600 hover:underline">
            ← Back to customer accounts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">{customer?.name ?? "Customer product history"}</h1>
          {customer && <p className="text-sm text-gray-500">{customer.phone} · {customer.villageArea || "Unspecified"}</p>}
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <Filter label="From">
            <input type="date" value={from} max={to} onChange={(e) => updateDate("from", e.target.value)} className="filter-input w-full min-w-0" />
          </Filter>
          <Filter label="To">
            <input type="date" value={to} min={from} onChange={(e) => updateDate("to", e.target.value)} className="filter-input w-full min-w-0" />
          </Filter>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label="Total quantity" value={`${number(totals.kg)} kg`} />
        <Stat label="Total amount" value={money(totals.amount)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-max text-sm">
          <thead className="text-white">
            <tr className="bg-emerald-700">
              <th rowSpan={2} className="sticky left-0 z-10 min-w-32 border-r border-emerald-500 bg-emerald-700 px-4 py-3 text-left">
                Date
              </th>
              {activeProducts.map((product) => (
                <th key={product.id} colSpan={1} className="min-w-48 border-r border-emerald-500 px-3 py-3 text-center text-base font-semibold">
                  {product.name}
                </th>
              ))}
              <th colSpan={2} className="sticky right-0 z-20 min-w-48 border-l border-emerald-500 bg-emerald-700 px-3 py-3 text-center text-base font-semibold">
                Total
              </th>
            </tr>
            <tr className="bg-emerald-600">
              {activeProducts.map((product) => (
                <Fragment key={product.id}>
                  <th className="min-w-20 border-r border-emerald-400 px-3 py-2 text-center">Kg</th>
                </Fragment>
              ))}
              <th className="sticky right-28 z-20 min-w-20 border-l border-emerald-400 bg-emerald-600 px-3 py-2 text-center">Kg</th>
              <th className="sticky right-0 z-20 min-w-28 bg-emerald-600 px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Empty text="Loading product history..." columns={columnCount} />
            ) : dateRows.length === 0 ? (
              <Empty text="No product history found for this date range." columns={columnCount} />
            ) : dateRows.map((row) => (
              <tr key={row.date} className="border-t border-gray-100 odd:bg-white even:bg-gray-50/60 hover:bg-emerald-50/50">
                <td className="sticky left-0 bg-inherit px-4 py-3 font-medium text-gray-900">
                  {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN")}
                </td>
                {activeProducts.map((product) => {
                  const value = row.byProduct.get(product.id);
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-gray-100 px-3 py-3 text-center">{value ? number(value.kg) : "—"}</td>
                    </Fragment>
                  );
                })}
                <td className="sticky right-28 border-l border-emerald-100 bg-emerald-50 px-3 py-3 text-center font-semibold">{number(row.kg)}</td>
                <td className="sticky right-0 bg-emerald-50 px-3 py-3 text-right font-semibold">{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          {!loading && dateRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-emerald-600 bg-emerald-100 font-semibold text-gray-900">
                <td className="sticky left-0 bg-emerald-100 px-4 py-3">TOTAL</td>
                {activeProducts.map((product) => {
                  const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-emerald-200 px-3 py-3 text-center">{number(value.kg)}</td>
                    </Fragment>
                  );
                })}
                <td className="sticky right-28 border-l border-emerald-200 bg-emerald-100 px-3 py-3 text-center">{number(totals.kg)}</td>
                <td className="sticky right-0 bg-emerald-100 px-3 py-3 text-right">{money(totals.amount)}</td>
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

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p></div>;
}

function Empty({ text, columns }: { text: string; columns: number }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
