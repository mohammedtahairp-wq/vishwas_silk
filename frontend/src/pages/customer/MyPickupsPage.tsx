import { Fragment, useEffect, useMemo, useState } from "react";
import { customerApi } from "../../api/customer.api";
import type { PickupSafe } from "../../api/types";

const number = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function MyPickupsPage() {
  const [pickups, setPickups] = useState<PickupSafe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerApi
      .myPickups()
      .then(setPickups)
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of pickups) {
      if (Number(p.kg) === 0 || !p.product?.name) continue;
      if (!map.has(p.productId)) map.set(p.productId, { id: p.productId, name: p.product.name });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [pickups]);

  const productTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of pickups) totals.set(p.productId, (totals.get(p.productId) ?? 0) + Number(p.kg));
    return totals;
  }, [pickups]);

  const totalKg = useMemo(() => pickups.reduce((sum, p) => sum + Number(p.kg), 0), [pickups]);

  const dateRows = useMemo(() => {
    const grouped = new Map<string, Map<string, number>>();
    for (const p of pickups) {
      const date = p.pickupDate.slice(0, 10);
      const byProduct = grouped.get(date) ?? new Map<string, number>();
      byProduct.set(p.productId, (byProduct.get(p.productId) ?? 0) + Number(p.kg));
      grouped.set(date, byProduct);
    }
    return [...grouped.entries()]
      .map(([date, byProduct]) => ({
        date,
        byProduct,
        kg: [...byProduct.values()].reduce((sum, value) => sum + value, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pickups]);

  const columnCount = products.length + 2;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My Pickups</h1>
        <p className="mt-1 text-sm text-gray-500">Your daily product quantities and totals.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-max text-sm">
          <thead className="text-white">
            <tr className="bg-emerald-700">
              <th rowSpan={2} className="sticky left-0 z-10 min-w-32 border-r border-emerald-500 bg-emerald-700 px-4 py-3 text-left">
                Date
              </th>
              {products.map((product) => (
                <th key={product.id} className="min-w-40 border-r border-emerald-500 px-3 py-3 text-center text-base font-semibold">
                  {product.name}
                </th>
              ))}
              <th className="min-w-32 border-l border-emerald-500 bg-emerald-700 px-3 py-3 text-center text-base font-semibold">
                Total
              </th>
            </tr>
            <tr className="bg-emerald-600">
              {products.map((product) => (
                <th key={product.id} className="min-w-20 border-r border-emerald-400 px-3 py-2 text-center">
                  Kg
                </th>
              ))}
              <th className="min-w-20 border-l border-emerald-400 bg-emerald-600 px-3 py-2 text-center">
                Kg
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Empty text="Loading pickups..." columns={columnCount} />
            ) : dateRows.length === 0 ? (
              <Empty text="No pickups yet." columns={columnCount} />
            ) : (
              dateRows.map((row) => (
                <tr key={row.date} className="border-t border-gray-100 odd:bg-white even:bg-gray-50/60 hover:bg-emerald-50/50">
                  <td className="sticky left-0 bg-inherit px-4 py-3 font-medium text-gray-900">
                    {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN")}
                  </td>
                  {products.map((product) => {
                    const kg = row.byProduct.get(product.id);
                    return (
                      <Fragment key={product.id}>
                        <td className="border-r border-gray-100 px-3 py-3 text-center">{kg != null ? number(kg) : "—"}</td>
                      </Fragment>
                    );
                  })}
                  <td className="border-l border-emerald-100 bg-emerald-50 px-3 py-3 text-center font-semibold">{number(row.kg)}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && dateRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-emerald-600 bg-emerald-100 font-semibold text-gray-900">
                <td className="sticky left-0 bg-emerald-100 px-4 py-3">TOTAL</td>
                {products.map((product) => (
                  <Fragment key={product.id}>
                    <td className="border-r border-emerald-200 px-3 py-3 text-center">{number(productTotals.get(product.id) ?? 0)}</td>
                  </Fragment>
                ))}
                <td className="border-l border-emerald-200 bg-emerald-100 px-3 py-3 text-center">{number(totalKg)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Empty({ text, columns }: { text: string; columns: number }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
