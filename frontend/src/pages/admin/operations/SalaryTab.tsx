import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../../api/admin.api";
import { apiErrorMessage } from "../../../api/client";
import {
  EMPLOYEE_CATEGORY_LABELS,
  type Employee,
  type EmployeeCategory,
  type SalaryMonthSummary,
  type SalaryPayment,
} from "../../../api/types";
import { Modal } from "../../../components/Modal";
import { inrCurrency } from "../dashboard/format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthYearOptions() {
  const now = new Date();
  const options: { month: number; year: number }[] = [];
  for (let i = -3; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return options.reverse();
}

export function SalaryTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<SalaryMonthSummary | null>(null);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const monthOptions = useMemo(monthYearOptions, []);
  const [error, setError] = useState<string | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [payDialog, setPayDialog] = useState<{
    row: SalaryMonthSummary["rows"][number];
    type: "advance" | "salary";
  } | null>(null);

  async function load() {
    try {
      const [emps, sum, pays] = await Promise.all([
        adminApi.listEmployees(),
        adminApi.salarySummary({ month: monthYear.month, year: monthYear.year }),
        adminApi.listSalaryPayments({ month: monthYear.month, year: monthYear.year }),
      ]);
      setEmployees(emps);
      setSummary(sum);
      setPayments(pays);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load salary data."));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);

  async function handleDeleteEmployee(employee: Employee) {
    if (!window.confirm(`Delete employee "${employee.name}"?`)) return;
    setError(null);
    try {
      await adminApi.deleteEmployee(employee.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete employee."));
    }
  }

  async function handleDeletePayment(payment: SalaryPayment) {
    if (!window.confirm(`Delete this ${payment.type} of ${inrCurrency(Number(payment.amount))}?`)) return;
    setError(null);
    try {
      await adminApi.deleteSalaryPayment(payment.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete payment."));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={`${monthYear.month}-${monthYear.year}`}
          onChange={(e) => {
            const [m, y] = e.target.value.split("-").map(Number);
            setMonthYear({ month: m, year: y });
          }}
        >
          {monthOptions.map((o) => (
            <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
              {MONTH_NAMES[o.month - 1]} {o.year}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAddEmployee(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-sm font-medium"
        >
          + Add Employee
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Monthly Salary" value={inrCurrency(summary.grandTotals.monthlySalary)} />
            <StatCard label="Taken Mid-Month" value={inrCurrency(summary.grandTotals.advanceTotal)} />
            <StatCard label="Paid at Month End" value={inrCurrency(summary.grandTotals.salaryPaidTotal)} />
            <StatCard label="Remaining to Pay" value={inrCurrency(summary.grandTotals.remaining)} highlight />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                Salaries — {MONTH_NAMES[summary.month - 1]} {summary.year}
              </h2>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-2">Employee</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2 text-right">Monthly Salary</th>
                  <th className="px-4 py-2 text-right">Taken Mid-Month</th>
                  <th className="px-4 py-2 text-right">Paid at End</th>
                  <th className="px-4 py-2 text-right">Remaining</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-gray-400" colSpan={7}>
                      No employees yet. Click "Add Employee" to create one.
                    </td>
                  </tr>
                ) : (
                  summary.rows.map((row) => (
                    <tr key={row.employeeId} className={`border-t border-gray-100 hover:bg-gray-50 ${row.status === "inactive" ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {row.name}
                        {row.status === "inactive" && (
                          <span className="ml-2 text-xs text-red-500">(inactive)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{EMPLOYEE_CATEGORY_LABELS[row.category]}</td>
                      <td className="px-4 py-2 text-right">{inrCurrency(row.monthlySalary)}</td>
                      <td className="px-4 py-2 text-right">{inrCurrency(row.advanceTotal)}</td>
                      <td className="px-4 py-2 text-right">{inrCurrency(row.salaryPaidTotal)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${row.remaining > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                        {inrCurrency(row.remaining)}
                      </td>
                      <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setPayDialog({ row, type: "advance" })}
                          className="text-blue-600 hover:underline"
                        >
                          Advance
                        </button>
                        <button
                          onClick={() => setPayDialog({ row, type: "salary" })}
                          className="text-emerald-600 hover:underline"
                        >
                          Pay Balance
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Employees</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Monthly Salary</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className={`border-t border-gray-100 hover:bg-gray-50 ${emp.status === "inactive" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2">{emp.name}</td>
                  <td className="px-4 py-2">{emp.phone || "—"}</td>
                  <td className="px-4 py-2">{EMPLOYEE_CATEGORY_LABELS[emp.category]}</td>
                  <td className="px-4 py-2 text-right">{inrCurrency(Number(emp.monthlySalary))}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingEmployee(emp)} className="text-emerald-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteEmployee(emp)} className="text-red-600 hover:underline">
                      Delete
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
          <h2 className="font-semibold text-gray-800">
            Payment History — {MONTH_NAMES[monthYear.month - 1]} {monthYear.year}
          </h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={6}>
                  No payments recorded for this month.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2">{p.employee?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.type === "advance" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {p.type === "advance" ? "Mid-month advance" : "Month-end salary"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{inrCurrency(Number(p.amount))}</td>
                  <td className="px-4 py-2 text-gray-500">{p.note || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDeletePayment(p)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddEmployee && (
        <EmployeeFormModal
          title="Add employee"
          onClose={() => setShowAddEmployee(false)}
          onSaved={async () => {
            setShowAddEmployee(false);
            await load();
          }}
        />
      )}

      {editingEmployee && (
        <EmployeeFormModal
          title="Edit employee"
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSaved={async () => {
            setEditingEmployee(null);
            await load();
          }}
        />
      )}

      {payDialog && summary && (
        <PaySalaryModal
          employeeId={payDialog.row.employeeId}
          employeeName={payDialog.row.name}
          type={payDialog.type}
          month={summary.month}
          year={summary.year}
          suggestedAmount={
            payDialog.type === "salary"
              ? Math.max(payDialog.row.remaining, 0)
              : payDialog.row.remaining
          }
          onClose={() => setPayDialog(null)}
          onSaved={async () => {
            setPayDialog(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${highlight ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-orange-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function EmployeeFormModal({
  title,
  employee,
  onClose,
  onSaved,
}: {
  title: string;
  employee?: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [category, setCategory] = useState<EmployeeCategory>(employee?.category ?? "sheet_machine");
  const [monthlySalary, setMonthlySalary] = useState(
    employee ? String(Number(employee.monthlySalary)) : ""
  );
  const [status, setStatus] = useState<"active" | "inactive">(employee?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (employee) {
        await adminApi.updateEmployee(employee.id, {
          name,
          phone: phone || null,
          category,
          monthlySalary: Number(monthlySalary),
          status,
        });
      } else {
        await adminApi.createEmployee({
          name,
          phone: phone || undefined,
          category,
          monthlySalary: Number(monthlySalary),
        });
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save employee."));
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={category}
            onChange={(e) => setCategory(e.target.value as EmployeeCategory)}
          >
            {(Object.keys(EMPLOYEE_CATEGORY_LABELS) as EmployeeCategory[]).map((c) => (
              <option key={c} value={c}>
                {EMPLOYEE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (₹)</label>
          <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} required />
        </div>
        {employee && (
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

function PaySalaryModal({
  employeeId,
  employeeName,
  type,
  month,
  year,
  suggestedAmount,
  onClose,
  onSaved,
}: {
  employeeId: string;
  employeeName: string;
  type: "advance" | "salary";
  month: number;
  year: number;
  suggestedAmount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.recordSalaryPayment({
        employee_id: employeeId,
        type,
        amount: Number(amount),
        month,
        year,
        payment_date: paymentDate,
        note: note || undefined,
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not record payment."));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={type === "advance" ? `Record advance — ${employeeName}` : `Pay month-end salary — ${employeeName}`}
      onClose={onClose}
    >
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-gray-500">
          {type === "advance"
            ? `Amount taken mid-month for ${MONTH_NAMES[month - 1]} ${year}. It will be deducted from the month-end salary.`
            : `Final salary payment for ${MONTH_NAMES[month - 1]} ${year}, after deducting mid-month advances.`}
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
          <input type="number" min="0.01" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment date</label>
          <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={note} onChange={(e) => setNote(e.target.value)} />
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
