import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { City, Customer, Product, Rider } from "../../api/types";
import { CitySelect } from "../../components/CitySelect";
import { Modal } from "../../components/Modal";

export function CustomersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCity = searchParams.get("city") ?? "";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [villageArea, setVillageArea] = useState("");
  const [assignedRiderId, setAssignedRiderId] = useState("");
  const [productPrices, setProductPrices] = useState<{ productId: string; pricePerKg: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);

  async function load() {
    setLoading(true);
    try {
      setCustomers(await adminApi.listCustomers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    adminApi.listCities().then(setCities);
    adminApi.listProducts().then(setProducts);
    adminApi.listRiders().then((rows) => setRiders(rows.filter((rider) => rider.status === "active")));
  }, []);

  const visibleCustomers = customers.filter((customer) => {
    if (selectedCity && (customer.villageArea?.trim() || "Unspecified") !== selectedCity) return false;
    const query = search.trim().toLowerCase();
    return !query || [customer.serialNumber, customer.name, customer.phone, customer.address, customer.villageArea]
      .some((value) => value?.toLowerCase().includes(query));
  });

  function changeCity(value: string) {
    setSearchParams(value ? { city: value } : {});
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const validProducts = productPrices.filter((p) => p.productId && p.pricePerKg);
      const customer = await adminApi.createCustomer({
        name,
        phone,
        address,
        villageArea: villageArea || undefined,
        products: validProducts.length > 0
          ? validProducts.map((p) => ({ productId: p.productId, pricePerKg: Number(p.pricePerKg) }))
          : undefined,
      });
      if (assignedRiderId) await adminApi.assignRider(customer.id, assignedRiderId);
      setName("");
      setPhone("");
      setAddress("");
      setVillageArea("");
      setAssignedRiderId("");
      setProductPrices([]);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create customer — check the fields and try again"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
    setError(null);
    try {
      await adminApi.deleteCustomer(customer.id);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete customer."));
    }
  }

  async function handleAssign(customer: Customer, riderId: string) {
    setError(null);
    try {
      const updated = await adminApi.assignRider(customer.id, riderId || null);
      setCustomers((current) => current.map((item) => item.id === customer.id ? updated : item));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not assign rider."));
      await load();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
            {selectedCity && <p className="mt-1 text-sm text-gray-500">Showing customers in {selectedCity}</p>}
          </div>
          <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-gray-600">Search customer
            <input className="ml-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm" placeholder="Serial, name, phone or address" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Filter by city
            <select
              className="ml-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800"
              value={selectedCity}
              onChange={(event) => changeCity(event.target.value)}
            >
              <option value="">All cities</option>
              {cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              {customers.some((customer) => !customer.villageArea?.trim()) && <option value="Unspecified">Unspecified</option>}
            </select>
          </label>
          </div>
        </div>
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <CitySelect cities={cities} value={villageArea} onChange={setVillageArea} className="w-full" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Assign rider</label>
            <select className="w-full rounded border border-gray-300 px-2 py-1.5" value={assignedRiderId} onChange={(e) => setAssignedRiderId(e.target.value)}>
              <option value="">Unassigned</option>
              {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
            </select>
          </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">Products &amp; Rates (optional)</label>
              <button type="button" onClick={() => setProductPrices([...productPrices, { productId: "", pricePerKg: "" }])} className="text-xs text-indigo-600 hover:underline">+ Add product</button>
            </div>
            {productPrices.length === 0 && <p className="text-xs text-gray-400">No products added. You can set them later from the customer detail page.</p>}
            {productPrices.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <select className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" value={row.productId} onChange={(e) => {
                  const next = [...productPrices]; next[idx] = { ...next[idx], productId: e.target.value }; setProductPrices(next);
                }} required>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" min="0.01" step="0.01" placeholder="Price/kg" className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm" value={row.pricePerKg} onChange={(e) => {
                  const next = [...productPrices]; next[idx] = { ...next[idx], pricePerKg: e.target.value }; setProductPrices(next);
                }} required />
                <button type="button" onClick={() => setProductPrices(productPrices.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
              </div>
            ))}
          </div>
          <div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded px-4 py-1.5 font-medium"
          >
            Add customer
          </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-2">Serial No</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Rider</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={7}>
                  Loading...
                </td>
              </tr>
            ) : visibleCustomers.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-gray-400" colSpan={7}>
                  No customers found{selectedCity ? ` in ${selectedCity}` : ""}.
                </td>
              </tr>
            ) : (
              visibleCustomers.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono font-semibold text-indigo-700">{c.serialNumber ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Link to={`/admin/customers/${c.id}`} className="text-indigo-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="px-4 py-2">{c.villageArea ?? "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      aria-label={`Assigned rider for ${c.name}`}
                      className="min-w-36 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      value={c.assignedRiderId ?? ""}
                      onChange={(event) => handleAssign(c, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 capitalize">{c.status}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline">
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
        <EditCustomerModal
          customer={editing}
          cities={cities}
          products={products}
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

function EditCustomerModal({ customer, cities, products, onClose, onSaved }: { customer: Customer; cities: City[]; products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [villageArea, setVillageArea] = useState(customer.villageArea ?? "");
  const [status, setStatus] = useState<Customer["status"]>(customer.status);
  const [productPrices, setProductPrices] = useState<{ productId: string; pricePerKg: string }[]>([]);
  const [loadedPrices, setLoadedPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.priceHistory(customer.id).then((prices) => {
      const latest = new Map<string, { productId: string; pricePerKg: string }>();
      for (const p of prices) {
        if (!latest.has(p.productId)) latest.set(p.productId, { productId: p.productId, pricePerKg: String(p.pricePerKg) });
      }
      setProductPrices([...latest.values()]);
      setLoadedPrices(true);
    }).catch(() => setLoadedPrices(true));
  }, [customer.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validProducts = productPrices.filter((p) => p.productId && p.pricePerKg);
      await adminApi.updateCustomer(customer.id, {
        name,
        phone,
        address,
        villageArea: villageArea || undefined,
        products: validProducts.map((p) => ({ productId: p.productId, pricePerKg: Number(p.pricePerKg) })),
      });
      if (status !== customer.status) {
        await adminApi.setCustomerStatus(customer.id, status);
      }
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save changes."));
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit customer" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {customer.serialNumber && (
          <div className="rounded bg-indigo-50 px-3 py-2 text-sm font-mono font-semibold text-indigo-700">
            {customer.serialNumber}
          </div>
        )}
        <Field label="Name">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Phone">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </Field>
        <Field label="Address">
          <input className="w-full border border-gray-300 rounded px-2 py-1.5" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </Field>
        <Field label="City">
          <CitySelect cities={cities} value={villageArea} onChange={setVillageArea} className="w-full" />
        </Field>
        <Field label="Status">
          <select className="w-full border border-gray-300 rounded px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value as Customer["status"])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Products &amp; Rates</label>
            <button type="button" onClick={() => setProductPrices([...productPrices, { productId: "", pricePerKg: "" }])} className="text-xs text-indigo-600 hover:underline">+ Add product</button>
          </div>
          {!loadedPrices && <p className="text-xs text-gray-400">Loading prices...</p>}
          {loadedPrices && productPrices.length === 0 && <p className="text-xs text-gray-400">No product rates set.</p>}
          {productPrices.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <select className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" value={row.productId} onChange={(e) => {
                const next = [...productPrices]; next[idx] = { ...next[idx], productId: e.target.value }; setProductPrices(next);
              }} required>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" placeholder="Price/kg" className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm" value={row.pricePerKg} onChange={(e) => {
                const next = [...productPrices]; next[idx] = { ...next[idx], pricePerKg: e.target.value }; setProductPrices(next);
              }} required />
              <button type="button" onClick={() => setProductPrices(productPrices.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-1.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
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
