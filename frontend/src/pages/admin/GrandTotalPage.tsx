import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Customer, PickupAdmin, Product, Rider } from "../../api/types";

interface ProductTotal {
  qty: number;
  amount: number;
}

interface DailyTotal {
  date: string;
  amount: number;
  products: Record<string, ProductTotal>;
}

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function initialDates() {
  const today = new Date();
  return { from: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateInputValue(today) };
}

function number(value: number, digits = 2) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

function money(value: number) {
  return value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

function displayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function GrandTotalPage() {
  const initial = useMemo(initialDates, []);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.listProducts(), adminApi.listCustomers(), adminApi.listRiders()])
      .then(([productRows, customerRows, riderRows]) => {
        setProducts(productRows);
        setCustomers(customerRows);
        setRiders(riderRows);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load report filters.")));
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    adminApi.listPickups({
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
    })
      .then((rows) => current && setPickups(rows))
      .catch((err) => current && setError(apiErrorMessage(err, "Could not load grand totals.")))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [from, to]);

  const cities = useMemo(
    () => [...new Set(customers.map((customer) => customer.villageArea).filter((value): value is string => Boolean(value)))].sort(),
    [customers]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pickups.filter((pickup) => {
      if (productId && pickup.productId !== productId) return false;
      if (customerId && pickup.customerId !== customerId) return false;
      if (riderId && pickup.riderId !== riderId) return false;
      if (city && pickup.customer?.villageArea !== city) return false;
      if (query && ![pickup.customer?.name, pickup.rider?.name, pickup.product?.name, pickup.customer?.villageArea]
        .some((value) => value?.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [pickups, productId, customerId, riderId, city, search]);

  const visibleProducts = useMemo(
    () => products.filter((product) => !productId || product.id === productId).filter((product) => filtered.some((pickup) => pickup.productId === product.id)),
    [products, productId, filtered]
  );

  const rows = useMemo(() => {
    const daily = new Map<string, DailyTotal>();
    for (const pickup of filtered) {
      const date = pickup.pickupDate.slice(0, 10);
      const row = daily.get(date) ?? { date, amount: 0, products: {} };
      const value = row.products[pickup.productId] ?? { qty: 0, amount: 0 };
      value.qty += Number(pickup.kg);
      value.amount += Number(pickup.amount);
      row.products[pickup.productId] = value;
      row.amount += Number(pickup.amount);
      daily.set(date, row);
    }
    return [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const totals = useMemo(() => {
    const productTotals: Record<string, ProductTotal> = {};
    let amount = 0;
    for (const row of rows) {
      amount += row.amount;
      for (const [id, value] of Object.entries(row.products)) {
        const total = productTotals[id] ?? { qty: 0, amount: 0 };
        total.qty += value.qty;
        total.amount += value.amount;
        productTotals[id] = total;
      }
    }
    return { amount, products: productTotals };
  }, [rows]);

  const clearFilters = () => {
    const dates = initialDates();
    setFrom(dates.from); setTo(dates.to); setProductId(""); setCustomerId("");
    setRiderId(""); setCity(""); setSearch("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grand Total</h1>
          <p className="mt-1 text-sm text-gray-500">Daily product quantity, amount and weighted average rate.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Filtered grand total</p>
          <p className="text-2xl font-bold text-emerald-700">{money(totals.amount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <Filter label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="filter-input" /></Filter>
        <Filter label="To"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="filter-input" /></Filter>
        <Filter label="Product"><select value={productId} onChange={(e) => setProductId(e.target.value)} className="filter-input"><option value="">All products</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Filter>
        <Filter label="City"><select value={city} onChange={(e) => setCity(e.target.value)} className="filter-input"><option value="">All cities</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></Filter>
        <Filter label="Customer"><select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="filter-input"><option value="">All customers</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Filter>
        <Filter label="Rider"><select value={riderId} onChange={(e) => setRiderId(e.target.value)} className="filter-input"><option value="">All riders</option>{riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Filter>
        <Filter label="Search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, product or city" className="filter-input" /></Filter>
        <div className="flex items-end"><button type="button" onClick={clearFilters} className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Reset filters</button></div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-500">
        <span>{rows.length} day{rows.length === 1 ? "" : "s"} Â· {filtered.length} pickup{filtered.length === 1 ? "" : "s"}</span>
        <span>{from && to ? `${displayDate(from)} â€“ ${displayDate(to)}` : "All dates"}</span>
      </div>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
        <table className="min-w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th rowSpan={2} className="border-r border-slate-600 px-3 py-2 text-right">Amount</th>
              <th rowSpan={2} className="border-r border-slate-600 px-3 py-2 text-left">Date</th>
              {visibleProducts.map((product) => <th key={product.id} colSpan={3} className="border-r border-slate-600 px-3 py-2 text-center">{product.name}</th>)}
            </tr>
            <tr className="bg-slate-700 text-xs text-white">
              {visibleProducts.map((product) => <ProductHead key={product.id} />)}
            </tr>
          </thead>
          <tbody>
            {loading ? <EmptyRow columns={2 + visibleProducts.length * 3} text="Loading grand totals..." />
              : rows.length === 0 ? <EmptyRow columns={2 + visibleProducts.length * 3} text="No pickups match these filters." />
              : rows.map((row) => (
                <tr key={row.date} className="border-t border-gray-200 hover:bg-emerald-50/40">
                  <td className="border-r border-gray-200 bg-slate-50 px-3 py-2 text-right font-semibold">{money(row.amount)}</td>
                  <td className="border-r border-gray-200 px-3 py-2 font-medium">{displayDate(row.date)}</td>
                  {visibleProducts.map((product) => <ProductCells key={product.id} value={row.products[product.id]} />)}
                </tr>
              ))}
          </tbody>
          {!loading && rows.length > 0 && <tfoot><tr className="border-t-2 border-slate-700 bg-slate-800 font-semibold text-white">
            <td className="border-r border-slate-600 px-3 py-3 text-right">{money(totals.amount)}</td><td className="border-r border-slate-600 px-3 py-3">GRAND TOTAL</td>
            {visibleProducts.map((product) => <ProductCells key={product.id} value={totals.products[product.id]} footer />)}
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-medium text-gray-600">{label}{children}</label>;
}

function ProductHead() {
  return <><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Amount</th><th className="border-r border-slate-600 px-3 py-2 text-right">Average Rate</th></>;
}

function ProductCells({ value, footer = false }: { value?: ProductTotal; footer?: boolean }) {
  const qty = value?.qty ?? 0;
  const amount = value?.amount ?? 0;
  const cell = footer ? "border-slate-600" : "border-gray-200";
  return <><td className={`px-3 py-2 text-right ${!value ? "text-gray-300" : ""}`}>{value ? number(qty) : "â€”"}</td><td className="px-3 py-2 text-right">{value ? number(amount) : "â€”"}</td><td className={`border-r px-3 py-2 text-right ${cell}`}>{value && qty ? number(amount / qty) : "â€”"}</td></>;
}

function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
