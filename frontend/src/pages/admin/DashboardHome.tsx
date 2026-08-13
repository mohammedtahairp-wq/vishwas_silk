import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

export function DashboardHome() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [cityFilterOptions, setCityFilterOptions] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(() => dateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.listCustomers(),
      adminApi.listPickups({ from: fromDate, to: toDate }),
      adminApi.listSettlements().catch(() => [] as Transaction[]),
      adminApi.listCities().catch(() => []),
    ])
      .then(([c, p, s, cityRows]) => {
        setCustomers(c);
        setPickups(p);
        setSettlements(s);
        setCityFilterOptions(cityRows.map((row) => row.name).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => setError("Could not load dashboard data. Please try again."))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  async function handleMarkPaid(id: string) {
    try {
      const paidDate = new Date().toISOString().slice(0, 10);
      await adminApi.markSettlementPaid(id, paidDate);
      setSettlements((prev) => prev.map((s) => (s.id === id ? { ...s, status: "paid", paidDate } : s)));
    } catch {
      /* ignore */
    }
  }

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
    const pendingList = [...pending].sort((a, b) => b.year - a.year || b.month - a.month);

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

    const productMap = new Map<string, number>();
    for (const p of fPickups) {
      const label = p.product?.name ?? "Unknown";
      productMap.set(label, (productMap.get(label) ?? 0) + Number(p.kg || 0));
    }
    const byProduct = [...productMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    const riderMap = new Map<string, number>();
    for (const p of fPickups) {
      const label = p.rider?.name ?? "Unassigned";
      riderMap.set(label, (riderMap.get(label) ?? 0) + Number(p.kg || 0));
    }
    const topRiders = [...riderMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);

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
      pendingList,
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
        <Header cities={cityFilterOptions} city="" onCity={() => {}} fromDate={fromDate} toDate={toDate} onFromDate={setFromDate} onToDate={setToDate} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-white/60 bg-white/50" style={{ animation: "shimmer 2s infinite", backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)", backgroundSize: "200% 100%" }} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-80 rounded-2xl border border-white/60 bg-white/50 lg:col-span-2" style={{ animation: "shimmer 2s infinite", backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)", backgroundSize: "200% 100%" }} />
          <div className="h-80 rounded-2xl border border-white/60 bg-white/50" style={{ animation: "shimmer 2s infinite", backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)", backgroundSize: "200% 100%" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header cities={cityFilterOptions} city="" onCity={() => {}} fromDate={fromDate} toDate={toDate} onFromDate={setFromDate} onToDate={setToDate} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 text-sm text-red-700 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            {error}
          </div>
        </motion.div>
      </div>
    );
  }

  const scope = city ? city : "All cities";
  const period = `${new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN")} – ${new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN")}`;

  return (
    <div className="space-y-6">
      <Header
        cities={cityFilterOptions}
        city={city}
        onCity={setCity}
        fromDate={fromDate}
        toDate={toDate}
        onFromDate={setFromDate}
        onToDate={setToDate}
      />

      <motion.div variants={container} initial="hidden" animate="show">
        {/* KPI tiles */}
        <motion.div variants={item} className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Showing: {scope} · {period}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Revenue"
              value={inrCurrency(stats.revenueThisMonth)}
              hint={`${Math.round(stats.kgThisMonth)} kg collected`}
              icon={
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
            />
            <KpiCard
              label="Pickups"
              value={String(stats.pickupsThisMonth)}
              hint="across all riders"
              icon={
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              }
            />
            <KpiCard
              label="Customers"
              value={String(stats.totalCustomers)}
              hint={`${stats.activeCustomers} active`}
              icon={
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              }
            />
            <KpiCard
              label="Pending settlements"
              value={inrCurrency(stats.pendingAmount)}
              hint={`${stats.pendingCount} awaiting payment`}
              accent={stats.pendingCount > 0}
              icon={
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stats.pendingCount > 0 ? "" : "opacity-60"}`} style={{ background: stats.pendingCount > 0 ? "linear-gradient(135deg, #f97316, #ef4444)" : "linear-gradient(135deg, #94a3b8, #64748b)" }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              }
            />
          </div>
        </motion.div>

        {/* Pending settlements */}
        {stats.pendingList.length > 0 && (
          <motion.div variants={item} className="mb-6">
            <Card title="Pending settlements" subtitle={`${stats.pendingList.length} awaiting payment · ${scope}`}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Month/Year</th>
                      <th className="px-3 py-2">Total kg</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.pendingList.map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{s.customer?.name ?? "—"}</td>
                        <td className="px-3 py-2">
                          {MONTHS[s.month - 1]} {s.year}
                        </td>
                        <td className="px-3 py-2">{Number(s.totalKg)} kg</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{inrCurrency(Number(s.totalAmount))}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleMarkPaid(s.id)} className="text-emerald-600 hover:underline whitespace-nowrap">
                            Mark paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-right">
                <button onClick={() => navigate("/admin/settlements")} className="text-sm text-emerald-600 hover:underline">
                  View all settlements →
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* City comparison */}
        <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-6">
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
          <Card title="Volume by product" subtitle={`Total kilograms · ${scope}`}>
            <BarList data={stats.byProduct} unit="kg" emptyLabel="No pickups recorded yet." />
          </Card>
        </motion.div>

        {/* Revenue trend + customer split */}
        <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-6">
          <Card className="lg:col-span-2" title="Revenue trend" subtitle={`Last 6 months · ${scope}`}>
            <ColumnChart data={stats.revenueByMonth} valueFormat={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))} prefix="₹" />
          </Card>
          <Card title="Active customers" subtitle={`Share of ${scope}`}>
            <div className="flex h-full items-center justify-center py-4">
              <Donut value={stats.activeCustomers} total={stats.totalCustomers} label="Active" />
            </div>
          </Card>
        </motion.div>

        {/* Product + rider breakdowns */}
        <motion.div variants={item} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Customers by city" subtitle="All cities">
            <BarList data={stats.customersByCity} highlight={city} emptyLabel="No customers yet." />
          </Card>
          <Card title="Top riders" subtitle={`By volume · ${scope}`}>
            <BarList data={stats.topRiders} unit="kg" emptyLabel="No rider activity yet." />
          </Card>
        </motion.div>
      </motion.div>
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
    "rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition-all duration-200 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100";
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#064e3b" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">Overview of pickups, revenue and settlements.</p>
      </div>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hidden sm:inline font-medium">City</span>
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
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          From
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => onFromDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
    </motion.div>
  );
}

function KpiCard({ label, value, hint, icon, accent = false }: { label: string; value: string; hint?: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm cursor-default"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${accent ? "text-emerald-600" : ""}`} style={!accent ? { color: "#064e3b" } : undefined}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-gray-400 font-medium">{hint}</p>}
        </div>
        {icon && <div className="shrink-0 ml-3">{icon}</div>}
      </div>
    </motion.div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-2xl border border-white/60 bg-white p-6 shadow-sm ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="mb-5">
        <h2 className="text-base font-bold" style={{ color: "#064e3b" }}>{title}</h2>
        {subtitle && <p className="text-xs font-medium text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}
