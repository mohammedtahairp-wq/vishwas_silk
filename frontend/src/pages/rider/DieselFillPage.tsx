import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { riderApi } from "../../api/rider.api";
import { apiErrorMessage } from "../../api/client";
import type { DieselLog, Unit, Vehicle } from "../../api/types";
import { UNIT_LABELS } from "../../api/types";
import { Modal } from "../../components/Modal";

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function displayDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function number(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function DieselFillPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<DieselLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [dieselAmount, setDieselAmount] = useState("");
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [dieselDate, setDieselDate] = useState(localDateValue());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState<DieselLog | null>(null);
  const [deleting, setDeleting] = useState<DieselLog | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const kmRun = useMemo(() => {
    const start = Number(startKm);
    const end = Number(endKm);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return end - start;
  }, [startKm, endKm]);

  const load = () => {
    Promise.all([riderApi.dieselVehicles(), riderApi.dieselLogs()])
      .then(([v, l]) => {
        setVehicles(v);
        setLogs(l);
        if (!vehicleId && v.length > 0) setVehicleId(v[0].id);
        setError(null);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load diesel data.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setVehicleId(vehicles[0]?.id ?? "");
    setDieselAmount("");
    setStartKm("");
    setEndKm("");
    setDieselDate(localDateValue());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    setMessage(null);
    if (!vehicleId) {
      setError("Select a vehicle first.");
      return;
    }
    const amount = Number(dieselAmount);
    const start = Number(startKm);
    const end = Number(endKm);
    if (!amount || amount <= 0) {
      setError("Enter a diesel amount greater than 0.");
      return;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      setError("Enter both start and end KM readings.");
      return;
    }
    if (end < start) {
      setError("End KM cannot be less than start KM.");
      return;
    }

    setSubmitting(true);
    try {
      await riderApi.createDieselLog({
        vehicle_id: vehicleId,
        diesel_date: dieselDate,
        diesel_amount: amount,
        start_km: start,
        end_km: end,
      });
      setMessage("Diesel log saved successfully!");
      resetForm();
      const logsResp = await riderApi.dieselLogs();
      setLogs(logsResp);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save diesel log."));
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = logs.reduce((s, l) => s + Number(l.dieselAmount), 0);
  const totalKm = logs.reduce((s, l) => s + Number(l.kmRun), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-700">⛽</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Diesel Fill</h1>
          <p className="text-sm text-gray-500">Record diesel filled and track kilometers run</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
              value={dieselDate}
              onChange={(e) => setDieselDate(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Select Vehicle</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.number}) · {UNIT_LABELS[v.unit as Unit]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Diesel Amount (₹)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 1500"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
              value={dieselAmount}
              onChange={(e) => setDieselAmount(e.target.value)}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Start KM</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Before filling"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">End KM</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="After run"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                required
              />
            </label>
          </div>

          {kmRun !== null && (
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <p className="text-xs font-medium text-emerald-700">Kilometers run with this diesel</p>
              <p className="text-2xl font-bold text-emerald-700">{number(kmRun)} km</p>
            </div>
          )}
        </div>

        {message && (
          <div className="rounded-lg bg-green-50 p-4 text-center text-base font-medium text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-base font-medium text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || vehicles.length === 0}
          className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "Saving..." : "Save Diesel Log"}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Diesel Filled</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">₹{number(totalAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total KM Run</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{number(totalKm)} km</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">My Diesel Logs</h2>
          <span className="text-sm text-gray-400">{logs.length}</span>
        </div>
        <table className="min-w-full whitespace-nowrap text-sm">
          <thead className="bg-emerald-700 text-left text-white">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2 text-right">Diesel (₹)</th>
              <th className="px-4 py-2 text-right">Start KM</th>
              <th className="px-4 py-2 text-right">End KM</th>
              <th className="px-4 py-2 text-right">KM Run</th>
              <th className="px-4 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No diesel logs yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">{displayDate(log.dieselDate)}</td>
                <td className="px-4 py-2 font-medium text-gray-900">
                  {log.vehicle ? `${log.vehicle.name} (${log.vehicle.number})` : "—"}
                </td>
                <td className="px-4 py-2 text-right">{number(Number(log.dieselAmount))}</td>
                <td className="px-4 py-2 text-right">{number(Number(log.startKm))}</td>
                <td className="px-4 py-2 text-right">{number(Number(log.endKm))}</td>
                <td className="px-4 py-2 text-right font-semibold text-emerald-700">{number(Number(log.kmRun))} km</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => setEditing(log)} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700">Edit</button>
                    <button onClick={() => setDeleting(log)} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDieselModal
          log={editing}
          vehicles={vehicles}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            const logsResp = await riderApi.dieselLogs();
            setLogs(logsResp);
          }}
          onError={(msg) => setActionError(msg)}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleting(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Delete diesel log?</h2>
            <p className="mt-1 text-sm text-gray-500">
              This will remove the ₹{number(Number(deleting.dieselAmount))} diesel log for {deleting.vehicle?.name ?? "this vehicle"} on {displayDate(deleting.dieselDate)}.
            </p>
            {actionError && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setDeleting(null); setActionError(null); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={async () => {
                  setActionError(null);
                  try {
                    await riderApi.deleteDieselLog(deleting.id);
                    setDeleting(null);
                    const logsResp = await riderApi.dieselLogs();
                    setLogs(logsResp);
                  } catch (err) {
                    setActionError(apiErrorMessage(err, "Could not delete diesel log."));
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

function EditDieselModal({
  log,
  vehicles,
  onClose,
  onSaved,
  onError,
}: {
  log: DieselLog;
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [vehicleId, setVehicleId] = useState(log.vehicleId);
  const [dieselAmount, setDieselAmount] = useState(log.dieselAmount);
  const [startKm, setStartKm] = useState(log.startKm);
  const [endKm, setEndKm] = useState(log.endKm);
  const [dieselDate, setDieselDate] = useState(log.dieselDate.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(dieselAmount);
    const start = Number(startKm);
    const end = Number(endKm);
    if (!amount || amount <= 0) {
      setError("Enter a diesel amount greater than 0.");
      return;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      setError("End KM cannot be less than start KM.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await riderApi.updateDieselLog(log.id, {
        vehicle_id: vehicleId,
        diesel_date: dieselDate,
        diesel_amount: amount,
        start_km: start,
        end_km: end,
      });
      onSaved();
    } catch (err) {
      const message = apiErrorMessage(err, "Could not update diesel log.");
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  const kmRun = Number(endKm) - Number(startKm);

  return (
    <Modal title="Edit Diesel Log" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-xs font-medium text-gray-600">
          Date
          <input type="date" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={dieselDate} onChange={(e) => setDieselDate(e.target.value)} required />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Vehicle
          <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.number})</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Diesel Amount (₹)
          <input type="number" min="0.01" step="0.01" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={dieselAmount} onChange={(e) => setDieselAmount(e.target.value)} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-gray-600">
            Start KM
            <input type="number" min="0" step="0.1" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={startKm} onChange={(e) => setStartKm(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            End KM
            <input type="number" min="0" step="0.1" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" value={endKm} onChange={(e) => setEndKm(e.target.value)} required />
          </label>
        </div>
        {Number.isFinite(kmRun) && (
          <p className="rounded bg-emerald-50 p-2 text-center text-sm font-semibold text-emerald-700">
            KM Run: {number(kmRun)} km
          </p>
        )}
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
