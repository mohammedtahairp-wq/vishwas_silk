import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../api/admin.api";
import { apiErrorMessage } from "../api/client";
import type { Product } from "../api/types";
import { Modal } from "./Modal";

export function EditCustomerRatesModal({
  customerId,
  customerName,
  products,
  onClose,
  onSaved,
}: {
  customerId: string;
  customerName: string;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productPrices, setProductPrices] = useState<{ productId: string; pricePerKg: string }[]>([]);
  const [loadedPrices, setLoadedPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.priceHistory(customerId).then((prices) => {
      const latest = new Map<string, { productId: string; pricePerKg: string }>();
      for (const price of prices) {
        if (!latest.has(price.productId)) {
          latest.set(price.productId, { productId: price.productId, pricePerKg: String(price.pricePerKg) });
        }
      }
      setProductPrices([...latest.values()]);
      setLoadedPrices(true);
    }).catch(() => setLoadedPrices(true));
  }, [customerId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validProducts = productPrices.filter((row) => row.productId && row.pricePerKg);
      await adminApi.updateCustomer(customerId, {
        products: validProducts.map((row) => ({
          productId: row.productId,
          pricePerKg: Number(row.pricePerKg),
        })),
      });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save rates."));
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit rates — ${customerName}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-xs text-gray-500">Rate changes apply to the whole current month.</p>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700">Products &amp; Rates</label>
          <button
            type="button"
            onClick={() => setProductPrices([...productPrices, { productId: "", pricePerKg: "" }])}
            className="text-xs text-emerald-600 hover:underline"
          >
            + Add product
          </button>
        </div>
        {!loadedPrices && <p className="text-xs text-gray-400">Loading prices...</p>}
        {loadedPrices && productPrices.length === 0 && <p className="text-xs text-gray-400">No product rates set.</p>}
        {productPrices.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
              value={row.productId}
              onChange={(e) => {
                const next = [...productPrices];
                next[idx] = { ...next[idx], productId: e.target.value };
                setProductPrices(next);
              }}
              required
            >
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Price/kg"
              className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
              value={row.pricePerKg}
              onChange={(e) => {
                const next = [...productPrices];
                next[idx] = { ...next[idx], pricePerKg: e.target.value };
                setProductPrices(next);
              }}
              required
            />
            <button
              type="button"
              onClick={() => setProductPrices(productPrices.filter((_, i) => i !== idx))}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-1.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Save rates
          </button>
        </div>
      </form>
    </Modal>
  );
}
