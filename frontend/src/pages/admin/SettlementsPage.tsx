import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import type { Customer, Transaction } from "../../api/types";

export function SettlementsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settlements, setSettlements] = useState<Transaction[]>([]);
  const [customerId, setCustomerId] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listCustomers().then(setCustomers);
  }, []);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!customerId) return;
    try {
      const transaction = await adminApi.generateSettlement({ customer_id: customerId, month, year });
      setSettlements((prev) => [transaction, ...prev]);
      setMessage(`Settlement generated: ₹${transaction.totalAmount} for ${transaction.totalKg}kg`);
    } catch {
      setError("Could not generate settlement (no unsettled pickups, or already settled for this month)");
    }
  }

  async function handleMarkPaid(id: string) {
    const paidDate = new Date().toISOString().slice(0, 10);
    const updated = await adminApi.markSettlementPaid(id, paidDate);
    setSettlements((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Settlements</h1>
        <form onSubmit={handleGenerate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <select className="border border-gray-300 rounded px-2 py-1.5" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={12}
            className="border border-gray-300 rounded px-2 py-1.5"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1.5"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 font-medium">
            Generate settlement
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Month/Year</th>
              <th className="px-4 py-2">Total kg</th>
              <th className="px-4 py-2">Total amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Paid date</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={6}>
                  Generated settlements will appear here.
                </td>
              </tr>
            ) : (
              settlements.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    {s.month}/{s.year}
                  </td>
                  <td className="px-4 py-2">{s.totalKg}</td>
                  <td className="px-4 py-2">₹{s.totalAmount}</td>
                  <td className="px-4 py-2 capitalize">{s.status}</td>
                  <td className="px-4 py-2">{s.paidDate ? new Date(s.paidDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2">
                    {s.status === "pending" && (
                      <button onClick={() => handleMarkPaid(s.id)} className="text-emerald-600 hover:underline">
                        Mark paid
                      </button>
                    )}
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
