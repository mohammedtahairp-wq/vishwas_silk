import { useEffect, useState } from "react";
import { customerApi } from "../../api/customer.api";
import type { Transaction } from "../../api/types";

export function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    customerApi.myTransactions().then(setTransactions);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Transaction History</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Month/Year</th>
              <th className="px-4 py-2">Total Kg</th>
              <th className="px-4 py-2">Total Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  No settlements yet — these appear once admin finalizes a month.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    {t.month}/{t.year}
                  </td>
                  <td className="px-4 py-2">{t.totalKg}</td>
                  <td className="px-4 py-2">₹{t.totalAmount}</td>
                  <td className="px-4 py-2 capitalize">{t.status}</td>
                  <td className="px-4 py-2">{t.paidDate ? new Date(t.paidDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">Per-product breakdown drill-in for a specific month is not yet wired up — see README.</p>
    </div>
  );
}
