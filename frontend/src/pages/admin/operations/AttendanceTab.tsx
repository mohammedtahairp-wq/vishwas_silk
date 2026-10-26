import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../api/admin.api";
import { apiErrorMessage } from "../../../api/client";
import {
  type AttendanceStatus,
  type Employee,
  type SalaryMonthSummary,
  type Unit,
} from "../../../api/types";

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

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export function AttendanceTab({ unit }: { unit?: Unit }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus> | null>(null);
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const monthOptions = useMemo(monthYearOptions, []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SalaryMonthSummary | null>(null);

  async function load() {
    try {
      const [emps, att, sum] = await Promise.all([
        adminApi.listEmployees(unit ? { unit } : undefined),
        adminApi.listAttendance({ month: monthYear.month, year: monthYear.year, ...(unit ? { unit } : {}) }),
        adminApi.salarySummary({ month: monthYear.month, year: monthYear.year, ...(unit ? { unit } : {}) }),
      ]);
      setEmployees(emps);
      setSummary(sum);
      const map: Record<string, AttendanceStatus> = {};
      for (const a of att) {
        const day = a.date.slice(0, 10);
        if (day === selectedDate) map[a.employeeId] = a.status;
      }
      setAttendance(map);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load attendance."));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear, unit, selectedDate]);

  async function toggle(employeeId: string, current: AttendanceStatus | undefined, status: AttendanceStatus) {
    setSaving(true);
    setError(null);
    try {
      await adminApi.setAttendance({
        employee_id: employeeId,
        date: selectedDate,
        status,
        unit: (unit as Unit) ?? getEmployeeUnit(employeeId),
      });
      setAttendance((prev) => ({ ...(prev ?? {}), [employeeId]: status }));
      if (current === status) {
        await load();
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save attendance."));
    } finally {
      setSaving(false);
    }
  }

  function getEmployeeUnit(employeeId: string): Unit {
    return employees.find((e) => e.id === employeeId)?.unit ?? "kolar";
  }

  const totalDays = summary?.totalDays ?? daysInMonth(monthYear.month, monthYear.year);

  return (
    <div className="space-y-6">
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
        <input
          type="date"
          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-gray-800">
            Daily Attendance — {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <span className="text-xs text-gray-500">
            {totalDays} days in {MONTH_NAMES[monthYear.month - 1]} {monthYear.year} · Absent day deducts 1 day salary
          </span>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2 text-center">Present</th>
              <th className="px-4 py-2 text-center">Absent</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  No employees in this unit yet.
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const current = attendance?.[emp.id];
                return (
                  <tr key={emp.id} className={`border-t border-gray-100 hover:bg-gray-50 ${emp.status === "inactive" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {emp.name}
                      {emp.status === "inactive" && <span className="ml-2 text-xs text-red-500">(inactive)</span>}
                    </td>
                    <td className="px-4 py-2">{emp.category.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2">{emp.unit}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggle(emp.id, current, "present")}
                        disabled={saving}
                        className={`px-4 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          current === "present" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-emerald-100"
                        }`}
                      >
                        Present
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggle(emp.id, current, "absent")}
                        disabled={saving}
                        className={`px-4 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          current === "absent" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-red-100"
                        }`}
                      >
                        Absent
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {summary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">
              Attendance Summary — {MONTH_NAMES[summary.month - 1]} {summary.year}
            </h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2 text-center">Present</th>
                <th className="px-4 py-2 text-center">Absent</th>
                <th className="px-4 py-2 text-right">Per Day</th>
                <th className="px-4 py-2 text-right">Deduction</th>
                <th className="px-4 py-2 text-right">Salary after Attendance</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) => (
                <tr key={row.employeeId} className={`border-t border-gray-100 hover:bg-gray-50 ${row.status === "inactive" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2 font-medium text-gray-800">{row.name}</td>
                  <td className="px-4 py-2 text-center text-emerald-600">{row.presentDays}</td>
                  <td className="px-4 py-2 text-center text-red-600">{row.absentDays}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.perDayRate)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{row.attendanceDeduction > 0 ? "-" + formatMoney(row.attendanceDeduction) : "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-800">{formatMoney(row.salaryAfterAttendance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
