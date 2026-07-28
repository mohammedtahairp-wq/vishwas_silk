import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { riderApi } from "../../api/rider.api";
import type { Customer, CustomerProduct } from "../../api/types";

export function LogPickupPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [kgValues, setKgValues] = useState<Record<string, string>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    riderApi.myCustomers().then((rows) => {
      setCustomers(rows);
      setFilteredCustomers(rows);
    });
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredCustomers(customers);
    } else {
      const q = search.trim().toLowerCase();
      setFilteredCustomers(
        customers.filter((c) =>
          [c.serialNumber, c.name, c.phone, c.villageArea]
            .some((v) => v?.toLowerCase().includes(q))
        )
      );
    }
  }, [search, customers]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setSearch(customer.serialNumber ? `${customer.serialNumber} - ${customer.name}` : customer.name);
    setShowDropdown(false);
    setError(null);
    setMessage(null);
    setKgValues({});
    setLoadingProducts(true);
    try {
      const customerProducts = await riderApi.customerProducts(customer.id);
      setProducts(customerProducts);
    } catch {
      setProducts([]);
      setError("Could not load products for this customer.");
    } finally {
      setLoadingProducts(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setShowDropdown(true);
    if (selectedCustomer) {
      const match = customers.find((c) => c.id === selectedCustomer.id);
      if (!match || (value !== (match.serialNumber ? `${match.serialNumber} - ${match.name}` : match.name))) {
        setSelectedCustomer(null);
        setProducts([]);
        setKgValues({});
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    const items = Object.entries(kgValues)
      .filter(([, kg]) => kg && Number(kg) > 0)
      .map(([productId, kg]) => ({ product_id: productId, kg: Number(kg) }));
    if (items.length === 0) { setError("Enter quantity for at least one product."); return; }
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await riderApi.logBatchPickup({ customer_id: selectedCustomer.id, items });
      setMessage("Pickup logged successfully!");
      setKgValues({});
    } catch {
      setError("Could not log pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-lg text-indigo-700">+</div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Log Pickup</h1>
          <p className="text-sm text-gray-500">Record milk collection from a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Select Customer</label>
          <div ref={dropdownRef} className="relative">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
              placeholder="Search by name, serial number, or phone..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
            />
            {showDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-indigo-50 ${selectedCustomer?.id === c.id ? "bg-indigo-50 font-semibold" : ""}`}
                    onClick={() => selectCustomer(c)}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {c.serialNumber?.slice(-2) ?? "?"}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.serialNumber ?? ""}{c.serialNumber && c.villageArea ? " · " : ""}{c.villageArea ?? ""}</p>
                    </div>
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && !loadingProducts && products.length === 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              No products have been assigned to this customer yet. Ask the admin to add products and rates.
            </p>
          )}
        </div>

        {loadingProducts && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <span className="ml-3 text-sm text-gray-500">Loading products...</span>
          </div>
        )}

        {selectedCustomer && products.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs text-green-700">✓</div>
              <h2 className="text-sm font-semibold text-gray-700">
                Enter collection for {selectedCustomer.name}
              </h2>
            </div>
            <div className="space-y-2">
              {products.map((p) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{p.productName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="kg"
                      className="w-28 rounded-lg border border-gray-300 px-3 py-2.5 text-center text-base font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      value={kgValues[p.productId] ?? ""}
                      onChange={(e) => setKgValues({ ...kgValues, [p.productId]: e.target.value })}
                    />
                    <span className="text-xs text-gray-400">kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          disabled={submitting || !selectedCustomer || products.length === 0}
          className="w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? "Saving..." : "Submit Collection"}
        </button>
      </form>
    </div>
  );
}