import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import type { Customer, Price, Product } from "../../api/types";

export function PricingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [scope, setScope] = useState("global");
  const [prices, setPrices] = useState<Price[]>([]);

  const [productId, setProductId] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.listCustomers().then(setCustomers);
    adminApi.listProducts().then(setProducts);
  }, []);

  useEffect(() => {
    adminApi.priceHistory(scope === "global" ? undefined : scope).then(setPrices);
  }, [scope]);

  async function handleSetPrice(e: FormEvent) {
    e.preventDefault();
    if (!productId || !pricePerKg) return;
    setError(null);
    try {
      await adminApi.setPrice({
        customer_id: scope === "global" ? null : scope,
        product_id: productId,
        price_per_kg: Number(pricePerKg),
        effective_from: effectiveFrom,
      });
      setPricePerKg("");
      setPrices(await adminApi.priceHistory(scope === "global" ? undefined : scope));
    } catch {
      setError("Could not set price");
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-semibold text-gray-900">Pricing</h1><p className="mt-1 text-sm text-gray-500">Set a global product price, then add customer-specific overrides only where needed.</p></div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Price applies to</label>
          <select className="border border-gray-300 rounded px-2 py-1.5 w-full md:w-80" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="global">All customers (global price)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

          <>
            <div className={`rounded p-3 text-sm ${scope === "global" ? "bg-indigo-50 text-indigo-800" : "bg-amber-50 text-amber-800"}`}>
              {scope === "global" ? "This is the default price used for every customer without an override." : "This customer-specific price overrides the global price for the selected product."}
            </div>
            <form onSubmit={handleSetPrice} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <select
                className="border border-gray-300 rounded px-2 py-1.5"
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
              <input
                type="number"
                step="0.01"
                placeholder="Price/kg"
                className="border border-gray-300 rounded px-2 py-1.5"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                required
              />
              <input
                type="date"
                className="border border-gray-300 rounded px-2 py-1.5"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-1.5 font-medium">
                Set {scope === "global" ? "global" : "customer"} price
              </button>
            </form>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <table className="min-w-full text-sm">
              <thead className="text-gray-600 text-left">
                <tr>
                  <th className="py-1">Product</th>
                  <th className="py-1">Price/kg</th>
                  <th className="py-1">Effective from</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-1">{p.product?.name}</td>
                    <td className="py-1">₹{p.pricePerKg}</td>
                    <td className="py-1">{new Date(p.effectiveFrom).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
      </div>
    </div>
  );
}
