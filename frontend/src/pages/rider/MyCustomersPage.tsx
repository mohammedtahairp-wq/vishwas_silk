import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { riderApi } from "../../api/rider.api";
import type { Customer } from "../../api/types";

export function MyCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    riderApi.myCustomers().then(setCustomers);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">My Customers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.length === 0 ? (
          <p className="text-gray-400">No customers assigned to you yet.</p>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/rider/log-pickup?customerId=${c.id}`)}
              className="text-left bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
            >
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-500">{c.phone}</p>
              <p className="text-sm text-gray-500">
                {c.address} {c.villageArea ? `Â· ${c.villageArea}` : ""}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
