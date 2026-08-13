import { useEffect, useMemo, useState } from "react";
import { customerApi } from "../../api/customer.api";
import type { PickupSafe } from "../../api/types";

type Tab = "daily" | "monthly" | "product";

const number = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function MyPickupsPage() {
  const [pickups, setPickups] = useState<PickupSafe[]>([]);
  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerApi
      .myPickups()
      .then(setPickups)
      .finally(() => setLoading(false));
  }, []);

  const totalKg = useMemo(() => pickups.reduce((sum, p) => sum + Number(p.kg), 0), [pickups]);

  const dailyRows = useMemo(
    () =>
      pickups.map((p) => ({
        id: p.id,
        date: new Date(p.pickupDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        product: p.product?.name ?? "Unknown product",
        kg: Number(p.kg),
      })),
    [pickups],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, { label: string; kg: number }>();
    for (const p of pickups) {
      const date = new Date(p.pickupDate);
      const key =
        tab === "monthly"
          ? `${date.getFullYear()}-${date.getMonth() + 1}`
          : p.product?.name ?? p.productId;
      const label =
        tab === "monthly"
          ? date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
          : p.product?.name ?? "Unknown product";
      const existing = buckets.get(key) ?? { label, kg: 0 };
      existing.kg += Number(p.kg);
      buckets.set(key, existing);
    }
    return Array.from(buckets.entries()).map(([key, v]) => ({ key, label: v.label, kg: v.kg }));
  }, [pickups, tab]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">My Pickups</h1>

      <div className="flex gap-2">
        {(["daily", "monthly", "product"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm capitalize ${
              tab === t ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {t === "product" ? "By Product" : t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full whitespace-nowrap text-sm">
          <thead className="bg-emerald-700 text-left text-white">
            <tr>
              <th className="px-3 py-2">{tab === "daily" ? "Date" : tab === "monthly" ? "Month" : "Product"}</th>
              {tab === "daily" && <th className="px-3 py-2">Product</th>}
              <th className="px-3 py-2 text-center">Total Kg</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={tab === "daily" ? 3 : 2} className="px-4 py-8 text-center text-gray-400">
                  Loading pickups...
                </td>
              </tr>
            ) : tab === "daily" ? (
              dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No pickups yet.
                  </td>
                </tr>
              ) : (
                dailyRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.product}</td>
                    <td className="px-3 py-2 text-center">{number(row.kg)}</td>
                  </tr>
                ))
              )
            ) : grouped.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                  No pickups yet.
                </td>
              </tr>
            ) : (
              grouped.map((g) => (
                <tr key={g.key} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">{g.label}</td>
                  <td className="px-3 py-2 text-center">{number(g.kg)}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && (dailyRows.length > 0 || grouped.length > 0) && (
            <tfoot>
              <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-semibold">
                <td className="px-3 py-2" colSpan={tab === "daily" ? 2 : 1}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-center">{number(totalKg)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
