import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { City, Rider } from "../../api/types";
import { CitySelect } from "../../components/CitySelect";
import { Modal } from "../../components/Modal";

export function RidersListPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [villageArea, setVillageArea] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [createdInfo, setCreatedInfo] = useState<{ name: string; loginPhone: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Rider | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRiders(await adminApi.listRiders());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    adminApi.listCities().then(setCities);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedInfo(null);
    try {
      const result = await adminApi.createRider({ name, phone, villageArea: villageArea || undefined, loginPhone });
      setCreatedInfo({ name, loginPhone: result.loginPhone });
      setName("");
      setPhone("");
      setVillageArea("");
      setLoginPhone("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create rider - check the fields and try again"));
    }
  }

  async function handleDelete(rider: Rider) {
    if (!window.confirm(`Delete rider "${rider.name}"?`)) return;
    setError(null);
    try {
      await adminApi.deleteRider(rider.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete rider."));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Riders</h1>
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input className="border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input className="border border-gray-300 rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <CitySelect cities={cities} value={villageArea} onChange={setVillageArea} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Login Phone</label>
            <input className="border border-gray-300 rounded px-2 py-1.5" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} required />
          </div>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 font-medium">
            Add rider
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {createdInfo && <p className="text-sm text-green-600 mt-2">Rider "{createdInfo.name}" created with login phone: {createdInfo.loginPhone}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : riders.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={5}>
                  No riders yet.
                </td>
              </tr>
            ) : (
              riders.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/admin/riders/${r.id}`} className="text-emerald-600 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.phone}</td>
                  <td className="px-4 py-2">{r.villageArea ?? ""}</td>
                  <td className="px-4 py-2 capitalize">{r.status}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="text-emerald-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r)} className="text-red-600 hover:underline">
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
        <EditRiderModal
          rider={editing}
          cities={cities}
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

function EditRiderModal({ rider, cities, onClose, onSaved }: { rider: Rider; cities: City[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(rider.name);
  const [phone, setPhone] = useState(rider.phone);
  const [villageArea, setVillageArea] = useState(rider.villageArea ?? "");
  const [status, setStatus] = useState<Rider["status"]>(rider.status);
  const [loginPhone, setLoginPhone] = useState(rider.loginPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateRider(rider.id, { name, phone, villageArea: villageArea || undefined, status, loginPhone: loginPhone || undefined });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save changes."));
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit rider" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Phone">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </Field>
        <Field label="City">
          <CitySelect cities={cities} value={villageArea} onChange={setVillageArea} className="w-full" />
        </Field>
        <Field label="Status">
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as Rider["status"])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Login Phone">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} required />
        </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
