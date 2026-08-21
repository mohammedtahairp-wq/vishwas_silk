import { useState } from "react";
import { SalaryTab } from "./SalaryTab";
import { TransportTab } from "./TransportTab";
import { MaintenanceTab } from "./MaintenanceTab";

const TABS = [
  { key: "salary", label: "Salary" },
  { key: "transport", label: "Transport" },
  { key: "maintenance", label: "Maintenance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function OperationsPage() {
  const [tab, setTab] = useState<TabKey>("salary");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Operations</h1>
        <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {TABS.map((t) => (
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

      {tab === "salary" && <SalaryTab />}
      {tab === "transport" && <TransportTab />}
      {tab === "maintenance" && <MaintenanceTab />}
    </div>
  );
}
