import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../../api/admin.api";
import { apiErrorMessage } from "../../../api/client";
import {
  TRANSPORT_CATEGORY_LABELS,
  type DieselLogAdmin,
  type DieselLogSummary,
  type Rider,
  type RiderReport,
  type TransportExpense,
  type TransportExpenseCategory,
  type TransportSummary,
  type Unit,
  type Vehicle,
  type VehicleReport,
} from "../../../api/types";
import { Modal } from "../../../components/Modal";
import { inrCurrency } from "../dashboard/format";

function number2(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function TransportTab({ unit }: { unit?: Unit }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<TransportExpense[]>([]);
  const [summary, setSummary] = useState<TransportSummary | null>(null);
  const [dieselLogs, setDieselLogs] = useState<DieselLogAdmin[]>([]);
  const [dieselSummary, setDieselSummary] = useState<DieselLogSummary | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showVehicleReport, setShowVehicleReport] = useState(false);
  const [showRiderReport, setShowRiderReport] = useState(false);

  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterCategory, setFilterCategory] = useState<"" | TransportExpenseCategory>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (unit) params.unit = unit;
      if (filterVehicle) params.vehicle_id = filterVehicle;
      if (filterCategory) params.category = filterCategory;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const [v, e, s, dl, dls, r] = await Promise.all([
        adminApi.listVehicles(unit ? { unit } : undefined),
        adminApi.listTransportExpenses(
          Object.keys(params).length ? (params as Parameters<typeof adminApi.listTransportExpenses>[0]) : undefined
        ),
        adminApi.transportSummary(
          unit || filterFrom || filterTo
            ? { unit: unit ?? undefined, from: filterFrom || undefined, to: filterTo || undefined }
            : undefined
        ),
        adminApi.listDieselLogs(
          unit || filterFrom || filterTo || filterVehicle
            ? { unit: unit ?? undefined, vehicle_id: filterVehicle || undefined, from: filterFrom || undefined, to: filterTo || undefined }
            : undefined
        ),
        adminApi.dieselLogSummary(
          unit || filterFrom || filterTo || filterVehicle
            ? { unit: unit ?? undefined, vehicle_id: filterVehicle || undefined, from: filterFrom || undefined, to: filterTo || undefined }
            : undefined
        ),
        adminApi.listRiders(),
      ]);
      setVehicles(v);
      setExpenses(e);
      setSummary(s);
      setDieselLogs(dl);
      setDieselSummary(dls);
      setRiders(r);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load transport data."));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVehicle, filterCategory, filterFrom, filterTo, unit]);

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
        <AddExpenseButton vehicles={vehicles} unit={unit as Unit} onSaved={load} />
        <button
          onClick={() => setShowVehicleReport(true)}
          className="bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 rounded px-4 py-1.5 text-sm font-medium"
        >
          Vehicle Report
        </button>
        <button
          onClick={() => setShowRiderReport(true)}
          className="bg-white border border-purple-600 text-purple-700 hover:bg-purple-50 rounded px-4 py-1.5 text-sm font-medium"
        >
          Rider Report
        </button>
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
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Rider Diesel Fills</h2>
          <span className="text-sm text-gray-400">{dieselLogs.length}</span>
        </div>
        {dieselSummary && (
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-3 gap-3 bg-emerald-50/50">
            <div>
              <p className="text-xs text-gray-500">Total Diesel Amount</p>
              <p className="text-lg font-semibold text-gray-900">{inrCurrency(dieselSummary.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total KM Run</p>
              <p className="text-lg font-semibold text-gray-900">{number2(dieselSummary.totalKm)} km</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entries</p>
              <p className="text-lg font-semibold text-gray-900">{dieselSummary.count}</p>
            </div>
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Rider</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2 text-right">Diesel (₹)</th>
              <th className="px-4 py-2 text-right">Start KM</th>
              <th className="px-4 py-2 text-right">End KM</th>
              <th className="px-4 py-2 text-right">KM Run</th>
            </tr>
          </thead>
          <tbody>
            {dieselLogs.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={7}>
                  No rider diesel fills recorded yet.
                </td>
              </tr>
            ) : (
              dieselLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(`${log.dieselDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{log.rider?.name ?? "—"}</td>
                  <td className="px-4 py-2">{log.vehicle ? `${log.vehicle.name} (${log.vehicle.number})` : "—"}</td>
                  <td className="px-4 py-2 text-right">{inrCurrency(Number(log.dieselAmount))}</td>
                  <td className="px-4 py-2 text-right">{number2(Number(log.startKm))}</td>
                  <td className="px-4 py-2 text-right">{number2(Number(log.endKm))}</td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-700">{number2(Number(log.kmRun))} km</td>
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
          unit={unit as Unit}
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
          unit={unit as Unit}
          onClose={() => setEditingVehicle(null)}
          onSaved={async () => {
            setEditingVehicle(null);
            await load();
          }}
        />
      )}

      {showVehicleReport && (
        <VehicleReportModal
          vehicles={vehicles}
          unit={unit as Unit}
          onClose={() => setShowVehicleReport(false)}
        />
      )}

      {showRiderReport && (
        <RiderReportModal
          riders={riders}
          onClose={() => setShowRiderReport(false)}
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

function AddExpenseButton({ vehicles, unit, onSaved }: { vehicles: Vehicle[]; unit: Unit; onSaved: () => void }) {
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
          unit={unit}
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
  unit,
  onClose,
  onSaved,
}: {
  vehicle?: Vehicle;
  unit: Unit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vehicle?.name ?? "");
  const [number, setNumber] = useState(vehicle?.number ?? "");
  const [unitValue, setUnitValue] = useState<Unit>(vehicle?.unit ?? unit);
  const [status, setStatus] = useState<"active" | "inactive">(vehicle?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (vehicle) {
        await adminApi.updateVehicle(vehicle.id, { name, number, unit: unitValue, status });
      } else {
        await adminApi.createVehicle({ name, number, unit: unitValue });
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={unitValue} onChange={(e) => setUnitValue(e.target.value as Unit)}>
            <option value="kolar">Kolar</option>
            <option value="sidlagatta">Sidlagatta</option>
            <option value="ramnagar">Ramnagar</option>
          </select>
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
  unit,
  onClose,
  onSaved,
}: {
  vehicles: Vehicle[];
  unit: Unit;
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
        unit,
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

function VehicleReportModal({
  vehicles,
  unit,
  onClose,
}: {
  vehicles: Vehicle[];
  unit: Unit;
  onClose: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const params: { from?: string; to?: string } = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await adminApi.vehicleReport(vehicleId, Object.keys(params).length ? params : undefined);
      setReport(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load vehicle report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (vehicleId) loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <Modal title="Vehicle Report" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.number})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-600">
            From
            <input type="date" className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            To
            <input type="date" className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {from && to && (
          <button onClick={loadReport} className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Apply Date Range
          </button>
        )}

        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-center text-sm text-gray-500 py-4">Loading report...</p>}

        {report && !loading && (
          <div className="space-y-3">
            {vehicle && (
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-sm font-semibold text-gray-900">{vehicle.name} ({vehicle.number})</p>
                <p className="text-xs text-gray-500">{unit ? `${unit.toUpperCase()} unit` : "All units"}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Rider Diesel Fills</p>
                <p className="font-semibold text-emerald-700">{inrCurrency(report.totals.dieselLogAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Admin Diesel</p>
                <p className="font-semibold text-amber-700">{inrCurrency(report.totals.dieselExpenseAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Repairs</p>
                <p className="font-semibold text-purple-700">{inrCurrency(report.totals.repairExpenseAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Total KM Run</p>
                <p className="font-semibold text-gray-900">{number2(report.totals.totalKm)} km</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Rider Diesel Fills ({report.dieselLogs.length})</p>
              <div className="max-h-40 overflow-y-auto rounded border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                    <tr>
                      <th className="px-2 py-1">Date</th>
                      <th className="px-2 py-1">Rider</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1 text-right">KM Run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.dieselLogs.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-3 text-gray-400 text-center">No diesel fills.</td></tr>
                    ) : report.dieselLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-100">
                        <td className="px-2 py-1 whitespace-nowrap">{new Date(`${log.dieselDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN")}</td>
                        <td className="px-2 py-1">{log.rider?.name ?? "—"}</td>
                        <td className="px-2 py-1 text-right">{inrCurrency(Number(log.dieselAmount))}</td>
                        <td className="px-2 py-1 text-right">{number2(Number(log.kmRun))} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">All Expenses: Diesel & Repair ({report.expenses.length})</p>
              <div className="max-h-40 overflow-y-auto rounded border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                    <tr>
                      <th className="px-2 py-1">Date</th>
                      <th className="px-2 py-1">Type</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-3 text-gray-400 text-center">No expenses.</td></tr>
                    ) : report.expenses.map((ex) => (
                      <tr key={ex.id} className="border-t border-gray-100">
                        <td className="px-2 py-1 whitespace-nowrap">{new Date(ex.expenseDate).toLocaleDateString("en-IN")}</td>
                        <td className="px-2 py-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${ex.category === "diesel" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                            {TRANSPORT_CATEGORY_LABELS[ex.category]}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right">{inrCurrency(Number(ex.amount))}</td>
                        <td className="px-2 py-1 text-gray-500">{ex.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RiderReportModal({
  riders,
  onClose,
}: {
  riders: Rider[];
  onClose: () => void;
}) {
  const [riderId, setRiderId] = useState(riders[0]?.id ?? "");
  const [report, setReport] = useState<RiderReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!riderId) return;
    setLoading(true);
    setError(null);
    adminApi.riderDieselReport(riderId)
      .then(setReport)
      .catch((err) => setError(apiErrorMessage(err, "Could not load rider report.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderId]);

  return (
    <Modal title="Rider Report (which vehicle on which days)" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rider</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="text-center text-sm text-gray-500 py-4">Loading report...</p>}

        {report && !loading && (
          <>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-sm font-semibold text-purple-800">{report.rider.name}</p>
              <p className="text-xs text-gray-500">{report.rider.phone}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Fills</p>
                <p className="font-semibold text-gray-900">{report.totals.count}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">Diesel Total</p>
                <p className="font-semibold text-emerald-700">{inrCurrency(report.totals.totalAmount)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-2">
                <p className="text-xs text-gray-500">KM Run</p>
                <p className="font-semibold text-gray-900">{number2(report.totals.totalKm)} km</p>
              </div>
            </div>
            <div className="rounded border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Vehicle</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                    <th className="px-2 py-1 text-right">Start KM</th>
                    <th className="px-2 py-1 text-right">End KM</th>
                    <th className="px-2 py-1 text-right">KM Run</th>
                  </tr>
                </thead>
                <tbody>
                  {report.dieselLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-2 py-4 text-gray-400 text-center">No diesel fills for this rider.</td></tr>
                  ) : report.dieselLogs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100">
                      <td className="px-2 py-1 whitespace-nowrap">{new Date(`${log.dieselDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN")}</td>
                      <td className="px-2 py-1 font-medium">{log.vehicle ? `${log.vehicle.name} (${log.vehicle.number})` : "—"}</td>
                      <td className="px-2 py-1 text-right">{inrCurrency(Number(log.dieselAmount))}</td>
                      <td className="px-2 py-1 text-right">{number2(Number(log.startKm))}</td>
                      <td className="px-2 py-1 text-right">{number2(Number(log.endKm))}</td>
                      <td className="px-2 py-1 text-right font-semibold text-emerald-700">{number2(Number(log.kmRun))} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
