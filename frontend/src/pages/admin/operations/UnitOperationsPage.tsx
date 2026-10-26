import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { UNIT_LABELS, type Unit } from "../../../api/types";
import { AttendanceTab } from "./AttendanceTab";
import { SalaryTab } from "./SalaryTab";
import { TransportTab } from "./TransportTab";
import { MaintenanceTab } from "./MaintenanceTab";

const VALID_UNITS = new Set<Unit>(["kolar", "sidlagatta", "ramnagar"]);

const OPS_TABS = [
  { key: "salary", label: "Salary" },
  { key: "attendance", label: "Attendance" },
  { key: "transport", label: "Transport" },
  { key: "maintenance", label: "Maintenance" },
] as const;

type OpTabKey = (typeof OPS_TABS)[number]["key"];

export function UnitOperationsPage() {
  const { unit } = useParams<{ unit: string }>();
  const [tab, setTab] = useState<OpTabKey>("salary");

  if (!unit || !VALID_UNITS.has(unit as Unit)) {
    return <Navigate to="/admin/operations" replace />;
  }

  const unitKey = unit as Unit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operations — {UNIT_LABELS[unitKey]}</h1>
          <p className="text-sm text-gray-500">All operations for the {UNIT_LABELS[unitKey]} unit</p>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {OPS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "salary" && <SalaryTab unit={unitKey} />}
      {tab === "attendance" && <AttendanceTab unit={unitKey} />}
      {tab === "transport" && <TransportTab unit={unitKey} />}
      {tab === "maintenance" && <MaintenanceTab unit={unitKey} />}
    </div>
  );
}
