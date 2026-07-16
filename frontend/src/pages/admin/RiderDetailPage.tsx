import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import type { Customer, Rider } from "../../api/types";

export function RiderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rider, setRider] = useState<Rider | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!id) return;
    adminApi.getRider(id).then(setRider);
    adminApi.getRiderCustomers(id).then(setCustomers);
  }, [id]);

  if (!rider) {
    return <p className="text-gray-400">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{rider.name}</h1>
        <p className="text-gray-500 text-sm">{rider.phone}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Village/Area</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={4}>
                  No customers assigned to this rider yet.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="px-4 py-2">{c.villageArea ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{c.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
