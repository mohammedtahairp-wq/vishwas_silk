import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { City, PickupAdmin, Product } from "../../api/types";

type Period = "daily" | "weekly" | "monthly";

interface ReportRow {
  customerId: string;
  customerName: string;
  values: Record<string, { kg: number; amount: number }>;
  totalKg: number;
  totalAmount: number;
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function reportRange(period: Period, value: string) {
  const selected = new Date(`${value}T00:00:00`);
  const from = new Date(selected);
  const to = new Date(selected);

  if (period === "weekly") {
    const dayFromMonday = (selected.getDay() + 6) % 7;
    from.setDate(selected.getDate() - dayFromMonday);
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
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function number(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function money(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function PickupsPage() {
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => reportRange(period, selectedDate), [period, selectedDate]);

  useEffect(() => {
    Promise.all([adminApi.listCities(), adminApi.listProducts()]).then(([cityRows, productRows]) => {
      setCities(cityRows);
      setProducts(productRows);
    });
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    adminApi
      .listPickups({ from: range.from, to: range.to })
      .then((rows) => current && setPickups(rows))
      .catch((err) => current && setError(apiErrorMessage(err, "Could not load the report.")))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [range.from, range.to]);

  const reportRows = useMemo(() => {
    const rows = new Map<string, ReportRow>();
    for (const pickup of pickups) {
      if (city && pickup.customer?.villageArea !== city) continue;
      const row = rows.get(pickup.customerId) ?? {
        customerId: pickup.customerId,
        customerName: pickup.customer?.name ?? "Unknown customer",
        values: {},
        totalKg: 0,
        totalAmount: 0,
      };
      const kg = Number(pickup.kg);
      const amount = Number(pickup.amount);
      const productValue = row.values[pickup.productId] ?? { kg: 0, amount: 0 };
      productValue.kg += kg;
      productValue.amount += amount;
      row.values[pickup.productId] = productValue;
      row.totalKg += kg;
      row.totalAmount += amount;
      rows.set(pickup.customerId, row);
    }
    return [...rows.values()].sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [pickups, city]);

  const visibleProducts = useMemo(
    () => products.filter((product) => reportRows.some((row) => row.values[product.id])),
    [products, reportRows]
  );

  const title = period === "daily" ? displayDate(range.from) : `${displayDate(range.from)} – ${displayDate(range.to)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">City-wise Customer Report</h1>
        <p className="mt-1 text-sm text-gray-500">Product quantities and amounts collected from each customer.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="text-xs font-medium text-gray-600">
          City
          <select className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Report period
          <select className="mt-1 w-full rounded border border-gray-300 px-2 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          {period === "daily" ? "Date" : period === "weekly" ? "Any date in week" : "Any date in month"}
          <input type="date" className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900">{city || "All cities"}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
        <p className="text-sm text-gray-500">{reportRows.length} customer{reportRows.length === 1 ? "" : "s"}</p>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full whitespace-nowrap text-sm">
          <thead className="bg-indigo-700 text-left text-white">
            <tr>
              <th rowSpan={2} className="border-r border-indigo-500 px-3 py-2">Customer</th>
              {visibleProducts.map((product) => (
                <th key={product.id} colSpan={2} className="border-r border-indigo-500 px-3 py-2 text-center">{product.name}</th>
              ))}
              <th colSpan={2} className="px-3 py-2 text-center">Total</th>
            </tr>
            <tr className="bg-indigo-600 text-xs">
              {visibleProducts.map((product) => (
                <FragmentColumns key={product.id} />
              ))}
              <th className="px-3 py-2 text-right">Kg</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3 + visibleProducts.length * 2} className="px-4 py-8 text-center text-gray-400">Loading report...</td></tr>
            ) : reportRows.length === 0 ? (
              <tr><td colSpan={3 + visibleProducts.length * 2} className="px-4 py-8 text-center text-gray-400">No pickups found for this city and period.</td></tr>
            ) : reportRows.map((row) => (
              <tr key={row.customerId} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="border-r border-gray-200 px-3 py-2 font-medium text-gray-900">{row.customerName}</td>
                {visibleProducts.map((product) => (
                  <ProductColumns key={product.id} kg={row.values[product.id]?.kg ?? 0} amount={row.values[product.id]?.amount ?? 0} />
                ))}
                <td className="bg-gray-50 px-3 py-2 text-right font-medium">{number(row.totalKg)}</td>
                <td className="bg-gray-50 px-3 py-2 text-right font-medium">{money(row.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentColumns() {
  return <><th className="px-3 py-2 text-right">Kg</th><th className="border-r border-indigo-500 px-3 py-2 text-right">Amount</th></>;
}

function ProductColumns({ kg, amount }: { kg: number; amount: number }) {
  return <><td className="px-3 py-2 text-right">{number(kg)}</td><td className="border-r border-gray-200 px-3 py-2 text-right">{money(amount)}</td></>;
}
