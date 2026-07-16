import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Customer, PickupAdmin, Price, Product, Rider, Transaction } from "../../api/types";

type View = "daily" | "monthly";

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function money(value: number | string) {
  return Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
}

function number(value: number | string) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [globalPrices, setGlobalPrices] = useState<Price[]>([]);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [view, setView] = useState<View>("monthly");
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [priceProductId, setPriceProductId] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(localDate());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      const [c, r, p, ph, gp, pickupRows, settlementRows] = await Promise.all([
        adminApi.getCustomer(id), adminApi.listRiders(), adminApi.listProducts(), adminApi.priceHistory(id),
        adminApi.priceHistory(), adminApi.listPickups({ customer_id: id }), adminApi.listSettlements(),
      ]);
      setCustomer(c); setRiders(r); setProducts(p); setPrices(ph); setGlobalPrices(gp);
      setPickups(pickupRows); setSettlements(settlementRows.filter((row) => row.customerId === id));
      setSelectedRiderId(c.assignedRiderId ?? "");
    } catch (err) { setError(apiErrorMessage(err, "Could not load customer details.")); }
  }

  useEffect(() => { load(); }, [id]);

  const filteredPickups = useMemo(() => pickups.filter((pickup) => {
    const date = pickup.pickupDate.slice(0, 10);
    return view === "daily" ? date === selectedDate : date.slice(0, 7) === selectedDate.slice(0, 7);
  }), [pickups, view, selectedDate]);

  const totals = useMemo(() => ({
    kg: filteredPickups.reduce((sum, pickup) => sum + Number(pickup.kg), 0),
    amount: filteredPickups.reduce((sum, pickup) => sum + Number(pickup.amount), 0),
  }), [filteredPickups]);

  const settledAmount = settlements.reduce((sum, row) => sum + Number(row.totalAmount), 0);
  const paidAmount = settlements.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.totalAmount), 0);

  async function handleAssignRider(e: FormEvent) {
    e.preventDefault(); if (!id) return;
    try { await adminApi.assignRider(id, selectedRiderId || null); await load(); }
    catch (err) { setError(apiErrorMessage(err, "Could not assign rider.")); }
  }

  async function handleSetPrice(e: FormEvent) {
    e.preventDefault(); if (!id || !priceProductId || !pricePerKg) return;
    try {
      await adminApi.setPrice({ customer_id: id, product_id: priceProductId, price_per_kg: Number(pricePerKg), effective_from: effectiveFrom });
      setPricePerKg(""); await load();
    } catch (err) { setError(apiErrorMessage(err, "Could not set customer price.")); }
  }

  async function markPaid(settlementId: string) {
    try { await adminApi.markSettlementPaid(settlementId, localDate()); await load(); }
    catch (err) { setError(apiErrorMessage(err, "Could not mark settlement paid.")); }
  }

  if (!customer) return <p className="text-gray-400">{error ?? "Loading customer ledger..."}</p>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Link to="/admin/customers" className="text-sm text-indigo-600 hover:underline">← Back to customer search</Link><h1 className="mt-2 text-2xl font-semibold text-gray-900">{customer.name}</h1><p className="text-sm text-gray-500">{customer.phone} · {customer.address}{customer.villageArea ? ` · ${customer.villageArea}` : ""}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${customer.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{customer.status}</span>
    </div>
    {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Selected quantity" value={`${number(totals.kg)} kg`} />
      <Stat label="Selected amount" value={money(totals.amount)} />
      <Stat label="Total settled" value={money(settledAmount)} />
      <Stat label="Paid settlements" value={money(paidAmount)} />
    </div>

    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Pickup details</h2><p className="text-sm text-gray-500">Applied price and amount for every collected product.</p></div><div className="flex gap-2"><select className="rounded border border-gray-300 px-2 py-1.5 text-sm" value={view} onChange={(e) => setView(e.target.value as View)}><option value="daily">Daily</option><option value="monthly">Monthly</option></select><input type={view === "daily" ? "date" : "month"} className="rounded border border-gray-300 px-2 py-1.5 text-sm" value={view === "daily" ? selectedDate : selectedDate.slice(0, 7)} onChange={(e) => setSelectedDate(view === "daily" ? e.target.value : `${e.target.value}-01`)} /></div></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Rider</th><th className="px-3 py-2 text-right">Quantity</th><th className="px-3 py-2 text-right">Applied price/kg</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{filteredPickups.length === 0 ? <Empty columns={7} text="No pickups for this period." /> : filteredPickups.map((pickup) => <tr key={pickup.id} className="border-t border-gray-100"><td className="px-3 py-2">{new Date(pickup.pickupDate).toLocaleDateString("en-IN")}</td><td className="px-3 py-2">{pickup.product?.name}</td><td className="px-3 py-2">{pickup.rider?.name}</td><td className="px-3 py-2 text-right">{number(pickup.kg)} kg</td><td className="px-3 py-2 text-right">{money(pickup.pricePerKgSnapshot)}</td><td className="px-3 py-2 text-right font-medium">{money(pickup.amount)}</td><td className="px-3 py-2 capitalize">{pickup.status.replaceAll("_", " ")}</td></tr>)}</tbody>{filteredPickups.length > 0 && <tfoot><tr className="border-t-2 border-indigo-600 bg-indigo-50 font-semibold"><td colSpan={3} className="px-3 py-2">TOTAL</td><td className="px-3 py-2 text-right">{number(totals.kg)} kg</td><td></td><td className="px-3 py-2 text-right">{money(totals.amount)}</td><td></td></tr></tfoot>}</table></div>
    </section>

    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold text-gray-900">Settlement history</h2><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="px-3 py-2">Month</th><th className="px-3 py-2 text-right">Kg</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Paid date</th><th className="px-3 py-2"></th></tr></thead><tbody>{settlements.length === 0 ? <Empty columns={6} text="No settlements generated for this customer." /> : settlements.map((row) => <tr key={row.id} className="border-t border-gray-100"><td className="px-3 py-2">{new Date(row.year, row.month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</td><td className="px-3 py-2 text-right">{number(row.totalKg)} kg</td><td className="px-3 py-2 text-right font-medium">{money(row.totalAmount)}</td><td className="px-3 py-2 capitalize">{row.status}</td><td className="px-3 py-2">{row.paidDate ? new Date(row.paidDate).toLocaleDateString("en-IN") : "—"}</td><td className="px-3 py-2 text-right">{row.status === "pending" && <button onClick={() => markPaid(row.id)} className="text-indigo-600 hover:underline">Mark paid</button>}</td></tr>)}</tbody></table></div></section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold text-gray-900">Assigned rider</h2><form onSubmit={handleAssignRider} className="flex gap-2"><select className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-2" value={selectedRiderId} onChange={(e) => setSelectedRiderId(e.target.value)}><option value="">Unassigned</option>{riders.filter((rider) => rider.status === "active" || rider.id === customer.assignedRiderId).map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}</select><button className="rounded bg-indigo-600 px-4 py-2 font-medium text-white">Save</button></form></section>
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-semibold text-gray-900">Set customer price override</h2><form onSubmit={handleSetPrice} className="grid grid-cols-2 gap-2"><select className="rounded border border-gray-300 px-2 py-2" value={priceProductId} onChange={(e) => setPriceProductId(e.target.value)} required><option value="">Product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Price/kg" className="rounded border border-gray-300 px-2 py-2" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} required /><input type="date" className="rounded border border-gray-300 px-2 py-2" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required /><button className="rounded bg-indigo-600 px-4 py-2 font-medium text-white">Set override</button></form></section>
    </div>

    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><h2 className="font-semibold text-gray-900">Product pricing</h2><p className="mb-3 text-sm text-gray-500">Customer overrides take priority; otherwise the global price applies.</p><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-gray-600"><tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Customer price</th><th className="px-3 py-2 text-right">Global fallback</th><th className="px-3 py-2">Effective price source</th></tr></thead><tbody>{products.map((product) => { const customerPrice = prices.filter((price) => price.productId === product.id && new Date(price.effectiveFrom) <= new Date()).sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]; const globalPrice = globalPrices.filter((price) => price.productId === product.id && new Date(price.effectiveFrom) <= new Date()).sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]; return <tr key={product.id} className="border-t border-gray-100"><td className="px-3 py-2">{product.name}</td><td className="px-3 py-2 text-right">{customerPrice ? money(customerPrice.pricePerKg) : "—"}</td><td className="px-3 py-2 text-right">{globalPrice ? money(globalPrice.pricePerKg) : "Not configured"}</td><td className="px-3 py-2">{customerPrice ? "Customer override" : globalPrice ? "Global price" : "Unavailable"}</td></tr>; })}</tbody></table></div></section>
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-xl font-bold text-gray-900">{value}</p></div>; }
function Empty({ columns, text }: { columns: number; text: string }) { return <tr><td colSpan={columns} className="px-4 py-8 text-center text-gray-400">{text}</td></tr>; }
