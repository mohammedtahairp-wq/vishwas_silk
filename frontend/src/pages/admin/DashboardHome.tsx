import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import type { Customer, PickupAdmin, Transaction } from "../../api/types";
import { BarList, ColumnChart, Donut } from "./dashboard/charts";
import { inrCurrency } from "./dashboard/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNSPECIFIED = "Unspecified";

const cityOf = (c: Customer) => c.villageArea?.trim() || UNSPECIFIED;
const dateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function DashboardHome() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(""); // "" = all cities
  const [fromDate, setFromDate] = useState(() => dateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));

  useEffect(() => {
    Promise.all([
      adminApi.listCustomers(),
      adminApi.listPickups(),
      adminApi.listSettlements().catch(() => [] as Transaction[]),
    ])
      .then(([c, p, s]) => {
        setCustomers(c);
        setPickups(p);
        setSettlements(s);
      })
      .catch(() => setError("Could not load dashboard data. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // Map customerId -> city, and the sorted list of distinct cities (always global).
  const { cityByCustomer, cities } = useMemo(() => {
    const map = new Map<string, string>();
    const set = new Set<string>();
    for (const c of customers) {
      const ct = cityOf(c);
      map.set(c.id, ct);
      set.add(ct);
    }
    const list = [...set].sort((a, b) => (a === UNSPECIFIED ? 1 : b === UNSPECIFIED ? -1 : a.localeCompare(b)));
    return { cityByCustomer: map, cities: list };
  }, [customers]);

  const stats = useMemo(() => {
    // Apply the city filter to every entity via the customer -> city map.
    const inCity = (custId: string | undefined) => !city || (custId != null && cityByCustomer.get(custId) === city);
    const fCustomers = customers.filter((c) => inCity(c.id));
    const inDateRange = (iso: string) => {
      const date = iso.slice(0, 10);
      return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
    };
    const settlementInRange = (settlement: Transaction) => {
      const monthStart = `${settlement.year}-${String(settlement.month).padStart(2, "0")}-01`;
      const monthEnd = dateInputValue(new Date(settlement.year, settlement.month, 0));
      return (!fromDate || monthEnd >= fromDate) && (!toDate || monthStart <= toDate);
    };
    const fPickups = pickups.filter((p) => inCity(p.customerId) && inDateRange(p.pickupDate));
    const fSettlements = settlements.filter((s) => inCity(s.customerId) && settlementInRange(s));

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const revenueThisMonth = fPickups.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const kgThisMonth = fPickups.reduce((sum, p) => sum + Number(p.kg || 0), 0);

    const pending = fSettlements.filter((s) => s.status === "pending");
    const pendingAmount = pending.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    // Revenue by month for the last 6 months (respects city filter)
    const buckets: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const p of fPickups) {
      const d = new Date(p.pickupDate);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.value += Number(p.amount || 0);
    }

    // Kg by product (respects city filter)
    const productMap = new Map<string, number>();
    for (const p of fPickups) {
      const label = p.product?.name ?? "Unknown";
      productMap.set(label, (productMap.get(label) ?? 0) + Number(p.kg || 0));
    }
    const byProduct = [...productMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    // Top riders by kg (respects city filter)
    const riderMap = new Map<string, number>();
    for (const p of fPickups) {
      const label = p.rider?.name ?? "Unassigned";
      riderMap.set(label, (riderMap.get(label) ?? 0) + Number(p.kg || 0));
    }
    const topRiders = [...riderMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // ── City breakdowns: ALWAYS across all cities (comparison view, ignores filter) ──
    const cityRevenue = new Map<string, number>();
    const cityCustomers = new Map<string, number>();
    for (const ct of cities) {
      cityRevenue.set(ct, 0);
      cityCustomers.set(ct, 0);
    }
    for (const c of customers) cityCustomers.set(cityOf(c), (cityCustomers.get(cityOf(c)) ?? 0) + 1);
    for (const p of pickups.filter((pickup) => inDateRange(pickup.pickupDate))) {
      const ct = cityByCustomer.get(p.customerId) ?? UNSPECIFIED;
      cityRevenue.set(ct, (cityRevenue.get(ct) ?? 0) + Number(p.amount || 0));
    }
    const revenueByCity = [...cityRevenue].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    const customersByCity = [...cityCustomers].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    return {
      totalCustomers: fCustomers.length,
      activeCustomers: fCustomers.filter((c) => c.status === "active").length,
      pickupsThisMonth: fPickups.length,
      kgThisMonth,
      revenueThisMonth,
      pendingCount: pending.length,
      pendingAmount,
      revenueByMonth: buckets,
      byProduct,
      topRiders,
      revenueByCity,
      customersByCity,
    };
  }, [customers, pickups, settlements, city, cityByCustomer, cities, fromDate, toDate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Header cities={[]} city="" onCity={() => {}} fromDate={fromDate} toDate={toDate} onFromDate={setFromDate} onToDate={setToDate} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header cities={[]} city="" onCity={() => {}} fromDate={fromDate} toDate={toDate} onFromDate={setFromDate} onToDate={setToDate} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const scope = city ? city : "All cities";
  const period = `${new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN")} – ${new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN")}`;

  return (
    <div className="space-y-6">
      <Header
        cities={cities}
        city={city}
        onCity={setCity}
        fromDate={fromDate}
        toDate={toDate}
        onFromDate={setFromDate}
        onToDate={setToDate}
      />

      {/* KPI tiles — scoped to the selected city */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Showing: {scope} · {period}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Revenue in period" value={inrCurrency(stats.revenueThisMonth)} hint={`${Math.round(stats.kgThisMonth)} kg collected`} />
          <Stat label="Pickups in period" value={String(stats.pickupsThisMonth)} hint="across all riders" />
          <Stat label="Customers" value={String(stats.totalCustomers)} hint={`${stats.activeCustomers} active`} />
          <Stat label="Pending settlements" value={inrCurrency(stats.pendingAmount)} hint={`${stats.pendingCount} awaiting payment`} accent={stats.pendingCount > 0} />
        </div>
      </div>

      {/* City comparison — always across all cities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Revenue by city" subtitle={`Selected period · all cities`}>
          <BarList
            data={stats.revenueByCity}
            format={inrCurrency}
            highlight={city}
            emptyLabel="No revenue recorded yet."
            onItemClick={(cityName) => navigate(
              `/admin/customer-accounts?city=${encodeURIComponent(cityName)}&from=${fromDate}&to=${toDate}`,
            )}
          />
        </Card>
        <Card title="Customers by city" subtitle="All cities">
          <BarList data={stats.customersByCity} highlight={city} emptyLabel="No customers yet." />
        </Card>
      </div>

      {/* Revenue trend + customer split (scoped) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Revenue trend" subtitle={`Last 6 months · ${scope}`}>
          <ColumnChart data={stats.revenueByMonth} valueFormat={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))} prefix="₹" />
        </Card>
        <Card title="Active customers" subtitle={`Share of ${scope}`}>
          <div className="flex h-full items-center justify-center py-4">
            <Donut value={stats.activeCustomers} total={stats.totalCustomers} label="Active" />
          </div>
        </Card>
      </div>

      {/* Product + rider breakdowns (scoped) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Volume by product" subtitle={`Total kilograms · ${scope}`}>
          <BarList data={stats.byProduct} unit="kg" emptyLabel="No pickups recorded yet." />
        </Card>
        <Card title="Top riders" subtitle={`By volume · ${scope}`}>
          <BarList data={stats.topRiders} unit="kg" emptyLabel="No rider activity yet." />
        </Card>
      </div>
    </div>
  );
}

function Header({
  cities,
  city,
  onCity,
  fromDate,
  toDate,
  onFromDate,
  onToDate,
}: {
  cities: string[];
  city: string;
  onCity: (v: string) => void;
  fromDate: string;
  toDate: string;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
}) {
  const inputClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Overview of pickups, revenue and settlements.</p>
      </div>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hidden sm:inline">City</span>
          <select
            value={city}
            onChange={(e) => onCity(e.target.value)}
            disabled={cities.length === 0}
            className={`${inputClass} disabled:opacity-50`}
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          From
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => onFromDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          To
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => onToDate(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${accent ? "text-indigo-600" : "text-gray-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
