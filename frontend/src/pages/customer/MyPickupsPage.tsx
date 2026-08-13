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

  const dailyGroups = useMemo(() => {
    const map = new Map<string, { date: Date; items: { id: string; product: string; kg: number }[] }>();
    for (const p of pickups) {
      const date = new Date(p.pickupDate);
      const key = date.toDateString();
      const entry = map.get(key) ?? { date, items: [] };
      entry.items.push({ id: p.id, product: p.product?.name ?? "Unknown product", kg: Number(p.kg) });
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [pickups]);

  const totalKg = useMemo(() => pickups.reduce((sum, p) => sum + Number(p.kg), 0), [pickups]);

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

      {tab === "daily" ? (
        <div className="space-y-3">
          {dailyGroups.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
              No pickups yet.
            </div>
          ) : (
            <>
              {dailyGroups.map((group) => (
                <div key={group.date.toDateString()} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-emerald-700">
                    {group.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="mt-2 space-y-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="border-l-2 border-emerald-100 pl-3">
                        <div className="text-sm text-gray-700">{item.product}</div>
                        <div className="text-sm font-semibold tabular-nums text-gray-900">{item.kg} kg</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-emerald-600 px-4 py-3 text-white shadow-sm">
                <span className="text-sm font-semibold uppercase tracking-wide">Total</span>
                <span className="text-lg font-bold tabular-nums">{totalKg} kg</span>
              </div>
            </>
          )}
        </div>
      ) : (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">{tab === "monthly" ? "Month" : "Product"}</th>
              <th className="px-4 py-2">Total Kg</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={2}>
                  No pickups yet.
                </td>
              </tr>
            ) : (
              grouped.map((g) => (
                <tr key={g.key} className="border-t border-gray-100">
                  <td className="px-4 py-2">{g.label}</td>
                  <td className="px-4 py-2">{g.kg}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
