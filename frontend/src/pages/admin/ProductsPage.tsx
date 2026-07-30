import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Product } from "../../api/types";
import { Modal } from "../../components/Modal";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [globalPrice, setGlobalPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  async function load() {
    setProducts(await adminApi.listProducts());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createProduct({ name, global_price_per_kg: Number(globalPrice), effective_from: effectiveFrom });
      setName("");
      setGlobalPrice("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create product (name may already exist)"));
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;
    setError(null);
    try {
      await adminApi.deleteProduct(product.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete product."));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Products</h1>
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product name</label>
            <input className="border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Global price/kg</label>
            <input type="number" min="0.01" step="0.01" className="border border-gray-300 rounded px-2 py-1.5" value={globalPrice} onChange={(e) => setGlobalPrice(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Effective from</label>
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 font-medium">
            Add product
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={4}>
                  No products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.unit}</td>
                  <td className="px-4 py-2 capitalize">{p.status}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="text-emerald-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function EditProductModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit);
  const [status, setStatus] = useState<Product["status"]>(product.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateProduct(product.id, { name, unit, status });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save changes."));
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit product" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as Product["status"])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-1.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
