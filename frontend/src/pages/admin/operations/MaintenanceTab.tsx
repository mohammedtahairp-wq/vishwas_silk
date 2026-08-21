import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../../api/admin.api";
import { apiErrorMessage } from "../../../api/client";
import {
  MAINTENANCE_CATEGORY_LABELS,
  type MaintenanceExpense,
  type MaintenanceExpenseCategory,
  type MaintenanceSummary,
} from "../../../api/types";
import { Modal } from "../../../components/Modal";
import { inrCurrency } from "../dashboard/format";

export function MaintenanceTab() {
  const [expenses, setExpenses] = useState<MaintenanceExpense[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<"" | MaintenanceExpenseCategory>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function load() {
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const [e, s] = await Promise.all([
        adminApi.listMaintenanceExpenses(
          Object.keys(params).length ? (params as Parameters<typeof adminApi.listMaintenanceExpenses>[0]) : undefined
        ),
        adminApi.maintenanceSummary(
          filterFrom || filterTo ? { from: filterFrom || undefined, to: filterTo || undefined } : undefined
        ),
      ]);
      setExpenses(e);
      setSummary(s);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load maintenance data."));
    }
  }

  useEffect(() => {
    load();
  }, [filterCategory, filterFrom, filterTo]);

  async function handleDelete(expense: MaintenanceExpense) {
    if (!window.confirm(`Delete this ${expense.category} expense of ${inrCurrency(Number(expense.amount))}?`)) return;
    setError(null);
    try {
      await adminApi.deleteMaintenanceExpense(expense.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete expense."));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 flex-wrap">
        <AddExpenseButton onSaved={load} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-end gap-3 flex-wrap bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            className="border border-gray-300 rounded px-2 py-1.5"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "" | MaintenanceExpenseCategory)}
          >
            <option value="">All categories</option>
            {(Object.keys(MAINTENANCE_CATEGORY_LABELS) as MaintenanceExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {MAINTENANCE_CATEGORY_LABELS[c]}
              </option>
            ))}
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
        {(filterCategory || filterFrom || filterTo) && (
          <button
            onClick={() => {
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Food Cost" value={inrCurrency(summary.foodTotal)} />
          <StatCard label="Machinery Cost" value={inrCurrency(summary.machineryTotal)} />
          <StatCard label="Others" value={inrCurrency(summary.othersTotal)} />
          <StatCard label="Grand Total" value={inrCurrency(summary.grandTotal)} highlight />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Maintenance Costs</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  No maintenance costs recorded.
                </td>
              </tr>
            ) : (
              expenses.map((ex) => (
                <tr key={ex.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(ex.expenseDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2">{MAINTENANCE_CATEGORY_LABELS[ex.category]}</td>
                  <td className="px-4 py-2 text-right">{inrCurrency(Number(ex.amount))}</td>
                  <td className="px-4 py-2 text-gray-600">{ex.description}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(ex)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

function AddExpenseButton({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-sm font-medium"
      >
        + Add Cost
      </button>
      {open && (
        <MaintenanceExpenseFormModal
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

function MaintenanceExpenseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<MaintenanceExpenseCategory>("food");
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
      await adminApi.createMaintenanceExpense({
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        description,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add cost."));
      setSaving(false);
    }
  }

  return (
    <Modal title="Add maintenance cost" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={category}
            onChange={(e) => setCategory(e.target.value as MaintenanceExpenseCategory)}
          >
            {(Object.keys(MAINTENANCE_CATEGORY_LABELS) as MaintenanceExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {MAINTENANCE_CATEGORY_LABELS[c]}
              </option>
            ))}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What was this cost for?"
          />
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
