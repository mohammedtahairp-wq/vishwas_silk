import { useEffect, useMemo, useState } from "react";
import { riderApi } from "../../api/rider.api";
import { apiErrorMessage } from "../../api/client";
import type { PickupSafe } from "../../api/types";

type Period = "daily" | "weekly" | "monthly";

interface HistoryRow {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  kg: number;
  pickups: number;
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function rangeFor(period: Period, selectedDate: string) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const from = new Date(selected);
  const to = new Date(selected);
  if (period === "weekly") {
    const daysFromMonday = (selected.getDay() + 6) % 7;
    from.setDate(selected.getDate() - daysFromMonday);
    to.setTime(from.getTime());
    to.setDate(from.getDate() + 6);
  } else if (period === "monthly") {
    from.setDate(1);
    to.setMonth(from.getMonth() + 1, 0);
  }
  return { from: localDateValue(from), to: localDateValue(to) };
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function number(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function MyPickupHistoryPage() {
  const [pickups, setPickups] = useState<PickupSafe[]>([]);
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    riderApi.myPickups()
      .then(setPickups)
      .catch((err) => setError(apiErrorMessage(err, "Could not load pickup history.")))
      .finally(() => setLoading(false));
  }, []);

  const range = useMemo(() => rangeFor(period, selectedDate), [period, selectedDate]);
  const customers = useMemo(() => {
    const values = new Map<string, string>();
    pickups.forEach((pickup) => values.set(pickup.customerId, pickup.customer?.name ?? "Unknown customer"));
    return [...values].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pickups]);
  const products = useMemo(() => {
    const values = new Map<string, string>();
    pickups.forEach((pickup) => values.set(pickup.productId, pickup.product?.name ?? "Unknown product"));
    return [...values].sort((a, b) => a[1].localeCompare(b[1]));
  }, [pickups]);

  const matchingPickups = useMemo(() => pickups.filter((pickup) => {
    const date = pickup.pickupDate.slice(0, 10);
    return date >= range.from && date <= range.to
      && (!customerId || pickup.customerId === customerId)
      && (!productId || pickup.productId === productId);
  }), [pickups, range, customerId, productId]);

  const rows = useMemo(() => {
    const values = new Map<string, HistoryRow>();
    for (const pickup of matchingPickups) {
      const key = `${pickup.customerId}:${pickup.productId}`;
      const row = values.get(key) ?? {
        customerId: pickup.customerId,
        customerName: pickup.customer?.name ?? "Unknown customer",
        productId: pickup.productId,
        productName: pickup.product?.name ?? "Unknown product",
        kg: 0,
        pickups: 0,
      };
      row.kg += Number(pickup.kg);
      row.pickups += 1;
      values.set(key, row);
    }
    return [...values.values()].sort((a, b) => a.customerName.localeCompare(b.customerName) || a.productName.localeCompare(b.productName));
  }, [matchingPickups]);

  const totalKg = rows.reduce((sum, row) => sum + row.kg, 0);
  const periodLabel = period === "daily" ? displayDate(range.from) : `${displayDate(range.from)} – ${displayDate(range.to)}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Customer Product History</h1>
        <p className="mt-1 text-sm text-gray-500">Quantities collected from your assigned customers. Pricing information is not shown.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-gray-600">Period
          <select className="filter-input" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">{period === "daily" ? "Date" : period === "weekly" ? "Any date in week" : "Any date in month"}
          <input type="date" className="filter-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-gray-600">Customer
          <select className="filter-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">All customers</option>{customers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">Product
          <select className="filter-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">All products</option>{products.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="font-medium text-gray-900">{periodLabel}</p><p className="text-sm text-gray-500">{matchingPickups.length} pickup{matchingPickups.length === 1 ? "" : "s"}</p></div>
        <div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Total collected</p><p className="text-2xl font-bold text-indigo-700">{number(totalKg)} kg</p></div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-indigo-700 text-left text-white"><tr><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Product</th><th className="px-4 py-2 text-right">Pickups</th><th className="px-4 py-2 text-right">Total quantity</th></tr></thead>
          <tbody>
            {loading ? <Empty text="Loading history..." /> : rows.length === 0 ? <Empty text="No pickups found for this period and filters." /> : rows.map((row) => (
              <tr key={`${row.customerId}:${row.productId}`} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-2 font-medium text-gray-900">{row.customerName}</td><td className="px-4 py-2">{row.productName}</td><td className="px-4 py-2 text-right">{row.pickups}</td><td className="px-4 py-2 text-right font-medium">{number(row.kg)} kg</td></tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && <tfoot><tr className="border-t-2 border-indigo-700 bg-indigo-50 font-semibold"><td colSpan={2} className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right">{matchingPickups.length}</td><td className="px-4 py-3 text-right">{number(totalKg)} kg</td></tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
