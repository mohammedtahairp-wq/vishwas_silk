import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../../api/admin.api";
import { apiErrorMessage } from "../../../api/client";
import {
  TRANSPORT_CATEGORY_LABELS,
  type TransportExpense,
  type TransportExpenseCategory,
  type TransportSummary,
  type Vehicle,
} from "../../../api/types";
import { Modal } from "../../../components/Modal";
import { inrCurrency } from "../dashboard/format";

export function TransportTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<TransportExpense[]>([]);
  const [summary, setSummary] = useState<TransportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterCategory, setFilterCategory] = useState<"" | TransportExpenseCategory>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (filterVehicle) params.vehicle_id = filterVehicle;
      if (filterCategory) params.category = filterCategory;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const [v, e, s] = await Promise.all([
        adminApi.listVehicles(),
        adminApi.listTransportExpenses(
          Object.keys(params).length ? (params as Parameters<typeof adminApi.listTransportExpenses>[0]) : undefined
        ),
        adminApi.transportSummary(
          filterFrom || filterTo ? { from: filterFrom || undefined, to: filterTo || undefined } : undefined
        ),
      ]);
      setVehicles(v);
      setExpenses(e);
      setSummary(s);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load transport data."));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVehicle, filterCategory, filterFrom, filterTo]);

  async function handleDeleteExpense(expense: TransportExpense) {
    if (!window.confirm(`Delete this ${expense.category} expense of ${inrCurrency(Number(expense.amount))}?`)) return;
    setError(null);
    try {
      await adminApi.deleteTransportExpense(expense.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete expense."));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowAddVehicle(true)}
          className="bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded px-4 py-1.5 text-sm font-medium"
        >
          + Add Vehicle
        </button>
        <AddExpenseButton vehicles={vehicles} onSaved={load} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-end gap-3 flex-wrap bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
          <select className="border border-gray-300 rounded px-2 py-1.5" value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}>
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.number})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "" | TransportExpenseCategory)}
          >
            <option value="">Diesel & Repair</option>
            <option value="diesel">Diesel</option>
            <option value="repair">Repair</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" className="border border-gray-300 rounded px-2 py-1.5" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" className="border border-gray-300 rounded px-2 py-1.5" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        {(filterVehicle || filterCategory || filterFrom || filterTo) && (
          <button
            onClick={() => {
              setFilterVehicle("");
              setFilterCategory("");
              setFilterFrom("");
              setFilterTo("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Diesel Cost" value={inrCurrency(summary.dieselTotal)} />
            <StatCard label="Total Repair Cost" value={inrCurrency(summary.repairTotal)} />
            <StatCard label="Grand Total" value={inrCurrency(summary.grandTotal)} highlight />
          </div>

          {summary.byVehicle.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Cost per Vehicle</h2>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-4 py-2">Vehicle</th>
                    <th className="px-4 py-2 text-right">Diesel</th>
                    <th className="px-4 py-2 text-right">Repair</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byVehicle.map((v) => (
                    <tr key={v.vehicleId} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{v.vehicleName} ({v.vehicleNumber})</td>
                      <td className="px-4 py-2 text-right">{inrCurrency(v.dieselTotal)}</td>
                      <td className="px-4 py-2 text-right">{inrCurrency(v.repairTotal)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{inrCurrency(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Vehicles</h2>
          <span className="text-sm text-gray-400">{vehicles.length}</span>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={4}>
                  No vehicles yet.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className={`border-t border-gray-100 hover:bg-gray-50 ${v.status === "inactive" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2">{v.name}</td>
                  <td className="px-4 py-2">{v.number}</td>
                  <td className="px-4 py-2 capitalize">{v.status}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingVehicle(v)} className="text-emerald-600 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Expenses</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={6}>
                  No expenses recorded.
                </td>
              </tr>
            ) : (
              expenses.map((ex) => (
                <tr key={ex.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(ex.expenseDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2">{ex.vehicle ? `${ex.vehicle.name} (${ex.vehicle.number})` : "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${ex.category === "diesel" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                      {TRANSPORT_CATEGORY_LABELS[ex.category]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{inrCurrency(Number(ex.amount))}</td>
                  <td className="px-4 py-2 text-gray-500">{ex.description || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDeleteExpense(ex)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddVehicle && (
        <VehicleFormModal
          onClose={() => setShowAddVehicle(false)}
          onSaved={async () => {
            setShowAddVehicle(false);
            await load();
          }}
        />
      )}

      {editingVehicle && (
        <VehicleFormModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSaved={async () => {
            setEditingVehicle(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${highlight ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-emerald-700" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function AddExpenseButton({ vehicles, onSaved }: { vehicles: Vehicle[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const activeVehicles = vehicles.filter((v) => v.status === "active");
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={activeVehicles.length === 0}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50 disabled:hover:bg-emerald-600"
        title={activeVehicles.length === 0 ? "Add a vehicle first" : undefined}
      >
        + Add Expense
      </button>
      {open && (
        <TransportExpenseFormModal
          vehicles={activeVehicles}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            onSaved();
          }}
        />
      )}
    </>
  );
}

function VehicleFormModal({
  vehicle,
  onClose,
  onSaved,
}: {
  vehicle?: Vehicle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vehicle?.name ?? "");
  const [number, setNumber] = useState(vehicle?.number ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(vehicle?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (vehicle) {
        await adminApi.updateVehicle(vehicle.id, { name, number, status });
      } else {
        await adminApi.createVehicle({ name, number });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save vehicle."));
      setSaving(false);
    }
  }

  return (
    <Modal title={vehicle ? "Edit vehicle" : "Add vehicle"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Lorry / Auto / Van" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Number</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={number} onChange={(e) => setNumber(e.target.value)} required placeholder="e.g. KA-05-AB-1234" />
        </div>
        {vehicle && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-1.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransportExpenseFormModal({
  vehicles,
  onClose,
  onSaved,
}: {
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [category, setCategory] = useState<TransportExpenseCategory>("diesel");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createTransportExpense({
        vehicle_id: vehicleId,
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        description: description || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add expense."));
      setSaving(false);
    }
  }

  return (
    <Modal title="Add transport expense" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.number})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={category} onChange={(e) => setCategory(e.target.value as TransportExpenseCategory)}>
            <option value="diesel">Diesel</option>
            <option value="repair">Repair</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
          <input type="number" min="0.01" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-1.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
