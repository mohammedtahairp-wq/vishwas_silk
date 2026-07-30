import { useEffect, useMemo, useState } from "react";
import { customerApi } from "../../api/customer.api";
import type { PickupSafe } from "../../api/types";

type Tab = "daily" | "monthly" | "product";

export function MyPickupsPage() {
  const [pickups, setPickups] = useState<PickupSafe[]>([]);
  const [tab, setTab] = useState<Tab>("daily");

  useEffect(() => {
    customerApi.myPickups().then(setPickups);
  }, []);

  const grouped = useMemo(() => {
    if (tab === "daily") {
      return pickups.map((p) => ({
        key: p.id,
        label: new Date(p.pickupDate).toLocaleDateString(),
        sub: p.product?.name ?? "",
        kg: Number(p.kg),
      }));
    }

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
    return Array.from(buckets.entries()).map(([key, v]) => ({ key, label: v.label, sub: "", kg: v.kg }));
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">{tab === "daily" ? "Date" : tab === "monthly" ? "Month" : "Product"}</th>
              {tab === "daily" && <th className="px-4 py-2">Product</th>}
              <th className="px-4 py-2">Total Kg</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={3}>
                  No pickups yet.
                </td>
              </tr>
            ) : (
              grouped.map((g) => (
                <tr key={g.key} className="border-t border-gray-100">
                  <td className="px-4 py-2">{g.label}</td>
                  {tab === "daily" && <td className="px-4 py-2">{g.sub}</td>}
                  <td className="px-4 py-2">{g.kg}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
