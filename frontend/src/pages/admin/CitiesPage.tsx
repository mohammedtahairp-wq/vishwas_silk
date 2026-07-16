import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { City } from "../../api/types";

export function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    try {
      setCities(await adminApi.listCities());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.createCity({ name: name.trim() });
      setName("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not add city — it may already exist."));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(city: City) {
    setEditingId(city.id);
    setEditName(city.name);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setError(null);
    try {
      await adminApi.updateCity(id, { name: editName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not rename city — the name may already exist."));
    }
  }

  async function handleDelete(city: City) {
    if (!window.confirm(`Delete "${city.name}"? Existing customers/riders keep their saved city text.`)) return;
    setError(null);
    try {
      await adminApi.deleteCity(city.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete city."));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Cities</h1>
        <p className="text-sm text-gray-500 mb-4">
          Add the cities you operate in. They appear as a dropdown when adding customers and riders.
        </p>
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City name</label>
            <input
              className="border border-gray-300 rounded px-2 py-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kanchipuram"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded px-4 py-1.5 font-medium"
          >
            Add city
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2 w-40 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={2}>
                  Loading...
                </td>
              </tr>
            ) : cities.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={2}>
                  No cities yet — add your first one above.
                </td>
              </tr>
            ) : (
              cities.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {editingId === c.id ? (
                      <input
                        className="border border-gray-300 rounded px-2 py-1 w-full max-w-xs"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{c.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    {editingId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} className="text-indigo-600 hover:underline">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="text-indigo-600 hover:underline">
                          Rename
                        </button>
                        <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </>
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
