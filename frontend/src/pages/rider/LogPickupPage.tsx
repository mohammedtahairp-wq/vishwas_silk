import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { riderApi } from "../../api/rider.api";
import { sharedApi } from "../../api/shared.api";
import type { Customer, Product } from "../../api/types";

export function LogPickupPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [priceReady, setPriceReady] = useState<boolean | null>(null);
  const [checkingPrice, setCheckingPrice] = useState(false);

  useEffect(() => {
    riderApi.myCustomers().then(setCustomers);
    sharedApi.listProducts().then(setProducts);
  }, []);

  useEffect(() => {
    if (!customerId || !productId) { setPriceReady(null); return; }
    let current = true;
    setCheckingPrice(true);
    riderApi.priceAvailability(customerId, productId)
      .then((available) => current && setPriceReady(available))
      .catch(() => current && setPriceReady(false))
      .finally(() => current && setCheckingPrice(false));
    return () => { current = false; };
  }, [customerId, productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await riderApi.logPickup({ customer_id: customerId, product_id: productId, kg: Number(kg) });
      setMessage("Pickup logged.");
      setKg("");
    } catch {
      setError("Could not log pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Log Pickup</h1>
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.serialNumber ? `${c.serialNumber} - ` : ""}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kg collected</label>
          <input
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded px-2 py-1.5"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            required
          />
        </div>

        {customerId && productId && (checkingPrice
          ? <p className="text-sm text-gray-500">Checking product availability...</p>
          : priceReady
            ? <p className="text-sm text-green-700">Product is ready for pickup.</p>
            : <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">This product is temporarily unavailable. Ask the admin to configure it.</p>)}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={submitting || checkingPrice || priceReady !== true}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded px-4 py-2 font-medium"
        >
          {submitting ? "Submitting..." : "Submit pickup"}
        </button>
      </form>
    </div>
  );
}
