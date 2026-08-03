import { Fragment, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { riderApi } from "../../api/rider.api";
import { apiErrorMessage } from "../../api/client";
import type { PickupSafe } from "../../api/types";

type Period = "daily" | "weekly" | "monthly";
type ViewMode = "summary" | "list";

interface ProductRow {
  productId: string;
  productName: string;
  kg: number;
  pickups: number;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  products: ProductRow[];
  totalKg: number;
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
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedDate, setSelectedDate] = useState(localDateValue());
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPickup, setEditingPickup] = useState<PickupSafe | null>(null);
  const [deletingPickup, setDeletingPickup] = useState<PickupSafe | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = () => {
    riderApi.myPickups()
      .then(setPickups)
      .catch((err) => setError(apiErrorMessage(err, "Could not load pickup history.")));
  };

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

  const groups = useMemo(() => {
    const map = new Map<string, Map<string, ProductRow>>();
    for (const pickup of matchingPickups) {
      const customerId = pickup.customerId;
      const productId = pickup.productId;
      if (!map.has(customerId)) map.set(customerId, new Map());
      const products = map.get(customerId)!;
      const row = products.get(productId) ?? { productId, productName: pickup.product?.name ?? "Unknown product", kg: 0, pickups: 0 };
      row.kg += Number(pickup.kg);
      row.pickups += 1;
      products.set(productId, row);
    }
    const result: CustomerGroup[] = [];
    for (const [customerId, products] of map) {
      const pickup = matchingPickups.find((p) => p.customerId === customerId);
      const sorted = [...products.values()].sort((a, b) => a.productName.localeCompare(b.productName));
      result.push({
        customerId,
        customerName: pickup?.customer?.name ?? "Unknown customer",
        products: sorted,
        totalKg: sorted.reduce((s, p) => s + p.kg, 0),
      });
    }
    return result.sort((a, b) => a.customerName.localeCompare(b.customerName));
  }, [matchingPickups]);

  const totalKg = groups.reduce((sum, g) => sum + g.totalKg, 0);
  const periodLabel = period === "daily" ? displayDate(range.from) : `${displayDate(range.from)} – ${displayDate(range.to)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customer Product History</h1>
          <p className="mt-1 text-sm text-gray-500">Quantities collected from your assigned customers. Pricing information is not shown.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          <button onClick={() => setViewMode("summary")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "summary" ? "bg-emerald-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>Summary</button>
          <button onClick={() => setViewMode("list")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${viewMode === "list" ? "bg-emerald-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>Pickups</button>
        </div>
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
        <div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Total collected</p><p className="text-2xl font-bold text-emerald-700">{number(totalKg)} kg</p></div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {viewMode === "summary" ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-700 text-left text-white"><tr><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Product</th><th className="px-4 py-2 text-right">Pickups</th><th className="px-4 py-2 text-right">Quantity</th></tr></thead>
            <tbody>
              {loading ? <Empty text="Loading history..." /> : groups.length === 0 ? <Empty text="No pickups found for this period and filters." /> : groups.map((group) => (
                <Fragment key={group.customerId}>
                  {group.products.map((product, pIdx) => (
                    <tr key={product.productId} className="border-t border-gray-100 hover:bg-gray-50">
                      {pIdx === 0 && (
                        <td className="px-4 py-2 font-medium text-gray-900" rowSpan={group.products.length}>
                          {group.customerName}
                        </td>
                      )}
                      <td className="px-4 py-2">{product.productName}</td>
                      <td className="px-4 py-2 text-right">{product.pickups}</td>
                      <td className="px-4 py-2 text-right font-medium">{number(product.kg)} kg</td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 text-sm font-semibold">
                    <td colSpan={2} className="px-4 py-2 text-emerald-800">Subtotal — {group.customerName}</td>
                    <td className="px-4 py-2 text-right text-emerald-800">{group.products.reduce((s, p) => s + p.pickups, 0)}</td>
                    <td className="px-4 py-2 text-right text-emerald-800">{number(group.totalKg)} kg</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
            {!loading && groups.length > 0 && <tfoot><tr className="border-t-2 border-emerald-700 bg-emerald-50 font-semibold"><td colSpan={2} className="px-4 py-3">TOTAL</td><td className="px-4 py-3 text-right">{matchingPickups.length}</td><td className="px-4 py-3 text-right">{number(totalKg)} kg</td></tr></tfoot>}
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full whitespace-nowrap text-sm">
            <thead className="bg-emerald-700 text-left text-white">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-right">Kg</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading pickups...</td></tr>
              ) : matchingPickups.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No pickups found for this period and filters.</td></tr>
              ) : matchingPickups.map((pickup) => (
                <tr key={pickup.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{displayDate(pickup.pickupDate.slice(0, 10))}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{pickup.customer?.name ?? "—"}</td>
                  <td className="px-4 py-2">{pickup.product?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{number(Number(pickup.kg))} kg</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pickup.status === "pending" ? "bg-yellow-100 text-yellow-800" : pickup.status === "included_in_settlement" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                      {pickup.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {pickup.status === "pending" && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setEditingPickup(pickup)} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Edit</button>
                        <button onClick={() => setDeletingPickup(pickup)} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPickup && (
        <EditPickupModal
          pickup={editingPickup}
          onClose={() => setEditingPickup(null)}
          onSaved={() => {
            setEditingPickup(null);
            reload();
          }}
          onError={(msg) => setActionError(msg)}
        />
      )}

      {deletingPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeletingPickup(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Delete pickup?</h2>
            <p className="mt-1 text-sm text-gray-500">
              This will permanently remove the {Number(deletingPickup.kg)} kg {deletingPickup.product?.name ?? "product"} pickup for {deletingPickup.customer?.name ?? "this customer"}.
            </p>
            {actionError && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setDeletingPickup(null); setActionError(null); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={async () => {
                  setActionError(null);
                  try {
                    await riderApi.deletePickup(deletingPickup.id);
                    setDeletingPickup(null);
                    reload();
                  } catch (err) {
                    setActionError(apiErrorMessage(err, "Could not delete pickup."));
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}

interface EditPickupModalProps {
  pickup: PickupSafe;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

function EditPickupModal({ pickup, onClose, onSaved, onError }: EditPickupModalProps) {
  const [kg, setKg] = useState(pickup.kg);
  const [pickupDate, setPickupDate] = useState(pickup.pickupDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const kgNumber = Number(kg);
    if (!kgNumber || kgNumber <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await riderApi.updatePickup(pickup.id, { kg: kgNumber, pickup_date: pickupDate });
      onSaved();
    } catch (err) {
      const message = apiErrorMessage(err, "Could not update pickup.");
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">Edit Pickup</h2>
        <p className="mt-1 text-sm text-gray-500">
          {pickup.customer?.name ?? "Customer"} · {pickup.product?.name ?? "Product"}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-gray-600">
            Quantity (kg)
            <input type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={kg} onChange={(e) => setKg(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Date
            <input type="date" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          </label>

          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
