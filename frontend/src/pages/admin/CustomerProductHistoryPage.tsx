import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import { apiErrorMessage } from "../../api/client";
import type { Customer, PickupAdmin, Product } from "../../api/types";

const localDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const money = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const number = (value: number | string) =>
  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const printDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN");

function buildHistoryPrintHtml(opts: {
  customer: Customer | null;
  dateRows: { date: string; byProduct: Map<string, { kg: number; amount: number }> }[];
  activeProducts: Product[];
  productTotals: Map<string, { kg: number; amount: number }>;
  totals: { kg: number; amount: number };
  city: string;
  from: string;
  to: string;
}) {
  const { customer, dateRows, activeProducts, productTotals, totals, city, from, to } = opts;
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rowCells = dateRows
    .map((row) => {
      const cells = activeProducts
        .map((product) => {
          const value = row.byProduct.get(product.id);
          return `<td class="num">${value ? number(value.kg) : "—"}</td>`;
        })
        .join("");
      return `<tr><td>${printDate(row.date)}</td>${cells}</tr>`;
    })
    .join("");
  const productCells = activeProducts
    .map((product) => {
      const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
      return `<td class="num">${number(value.kg)}</td>`;
    })
    .join("");
  const rateCells = activeProducts
    .map((product) => {
      const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
      return `<td class="num">${value.kg ? money(value.amount / value.kg) : "—"}</td>`;
    })
    .join("");
  const amountCells = activeProducts
    .map((product) => {
      const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
      return `<td class="num">${money(value.amount)}</td>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(customer?.name || "Customer Product History")}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; }
  .report-header { background: #065f46; color: #fff; padding: 16px 22px; }
  .report-header .logo { display: block; height: 48px; width: auto; margin-bottom: 10px; }
  .report-header h1 { margin: 0; font-size: 20px; letter-spacing: 0.3px; }
  .report-header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
  .meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; padding: 10px 22px; background: #f3f4f6; font-size: 12px; }
  table { width: calc(100% - 44px); margin: 16px 22px 0; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: left; }
  th { background: #065f46; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  tr.total td { background: #d1fae5; font-weight: 700; }
  tr.grand td { background: #d1fae5; font-weight: 700; font-size: 13px; }
  tr.rate td, tr.amount td { background: #ecfdf5; font-weight: 500; }
  .footer { margin: 16px 22px; font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
  <div class="report-header">
    <img class="logo" src="https://manage.vishwassilk.com/logo.jpeg" alt="VISHWAS SILK" />
    <h1>VISHWAS SILK</h1>
    <p>${escapeHtml(customer?.name ?? "")} · ${escapeHtml(customer?.phone ?? "")} · ${escapeHtml(customer?.villageArea || "Unspecified")}</p>
  </div>
  <div class="meta">
    <span><strong>Period:</strong> ${printDate(from)} – ${printDate(to)}</span>
    <span><strong>City:</strong> ${escapeHtml(city || "All cities")}</span>
    <span><strong>Generated on:</strong> ${escapeHtml(generatedAt)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        ${activeProducts.map((product) => `<th>${escapeHtml(product.name)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rowCells}
    </tbody>
    <tfoot>
      <tr class="total">
        <td>TOTAL</td>
        ${productCells}
      </tr>
      <tr class="rate">
        <td>Rate</td>
        ${rateCells}
      </tr>
      <tr class="amount">
        <td>Amount</td>
        ${amountCells}
      </tr>
      <tr class="grand">
        <td colspan="${activeProducts.length}">GRAND TOTAL</td>
        <td class="num">${money(totals.amount)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">Printed from VISHWAS SILK · https://manage.vishwassilk.com</p>
</body>
</html>`;
}

export function CustomerProductHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") ?? localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = searchParams.get("to") ?? localDate(new Date());
  const city = searchParams.get("city") ?? "";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pickups, setPickups] = useState<PickupAdmin[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.getCustomer(id),
      adminApi.listPickups({ customer_id: id, from, to }),
      adminApi.listProducts(),
    ])
      .then(([customerRow, pickupRows, productRows]) => {
        setCustomer(customerRow);
        setPickups(pickupRows);
        setProducts(productRows);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load product history.")))
      .finally(() => setLoading(false));
  }, [id, from, to]);

  const totals = useMemo(() => ({
    kg: pickups.reduce((sum, pickup) => sum + Number(pickup.kg), 0),
    amount: pickups.reduce((sum, pickup) => sum + Number(pickup.amount), 0),
  }), [pickups]);

  const productTotals = useMemo(() => {

    const result = new Map<string, { kg: number; amount: number }>();
    for (const product of products) result.set(product.id, { kg: 0, amount: 0 });
    for (const pickup of pickups) {
      const value = result.get(pickup.productId) ?? { kg: 0, amount: 0 };
      value.kg += Number(pickup.kg);
      value.amount += Number(pickup.amount);
      result.set(pickup.productId, value);
    }
    return result;
  }, [pickups, products]);

  const activeProducts = useMemo(
    () => products.filter((product) => {
      const value = productTotals.get(product.id);
      return value != null && (value.kg !== 0 || value.amount !== 0);
    }),
    [products, productTotals],
  );

  const dateRows = useMemo(() => {
    const grouped = new Map<string, Map<string, { kg: number; amount: number }>>();
    for (const pickup of pickups) {
      const date = pickup.pickupDate.slice(0, 10);
      const byProduct = grouped.get(date) ?? new Map<string, { kg: number; amount: number }>();
      const value = byProduct.get(pickup.productId) ?? { kg: 0, amount: 0 };
      value.kg += Number(pickup.kg);
      value.amount += Number(pickup.amount);
      byProduct.set(pickup.productId, value);
      grouped.set(date, byProduct);
    }
    return [...grouped.entries()]
      .map(([date, byProduct]) => ({ date, byProduct }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [pickups]);

  function updateDate(key: "from" | "to", value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  const backParams = new URLSearchParams({ from, to });
  if (city) backParams.set("city", city);
  const columnCount = activeProducts.length + 1;

  function handlePrint() {
    const html = buildHistoryPrintHtml({
      customer,
      dateRows,
      activeProducts,
      productTotals,
      totals,
      city,
      from,
      to,
    });
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) { setError("Pop-ups are blocked. Allow pop-ups for this site to print."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => { win.print(); };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to={`/admin/customer-accounts?${backParams.toString()}`} className="text-sm text-emerald-600 hover:underline">
            ← Back to customer accounts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">{customer?.name ?? "Customer product history"}</h1>
          {customer && <p className="text-sm text-gray-500">{customer.phone} · {customer.villageArea || "Unspecified"}</p>}
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <Filter label="From">
            <input type="date" value={from} max={to} onChange={(e) => updateDate("from", e.target.value)} className="filter-input w-full min-w-0" />
          </Filter>
          <Filter label="To">
            <input type="date" value={to} min={from} onChange={(e) => updateDate("to", e.target.value)} className="filter-input w-full min-w-0" />
          </Filter>
        </div>
        <button
          onClick={handlePrint}
          disabled={loading || dateRows.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
        >
          Print
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-max text-sm">
          <thead className="text-white">
            <tr className="bg-emerald-700">
              <th rowSpan={2} className="sticky left-0 z-10 min-w-32 border-r border-emerald-500 bg-emerald-700 px-4 py-3 text-left">
                Date
              </th>
              {activeProducts.map((product) => (
                <th key={product.id} colSpan={1} className="min-w-48 border-r border-emerald-500 px-3 py-3 text-center text-base font-semibold">
                  {product.name}
                </th>
              ))}
            </tr>
            <tr className="bg-emerald-600">
              {activeProducts.map((product) => (
                <Fragment key={product.id}>
                  <th className="min-w-20 border-r border-emerald-400 px-3 py-2 text-center">Kg</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Empty text="Loading product history..." columns={columnCount} />
            ) : dateRows.length === 0 ? (
              <Empty text="No product history found for this date range." columns={columnCount} />
            ) : dateRows.map((row) => (
              <tr key={row.date} className="border-t border-gray-100 odd:bg-white even:bg-gray-50/60 hover:bg-emerald-50/50">
                <td className="sticky left-0 bg-inherit px-4 py-3 font-medium text-gray-900">
                  {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN")}
                </td>
                {activeProducts.map((product) => {
                  const value = row.byProduct.get(product.id);
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-gray-100 px-3 py-3 text-center">{value ? number(value.kg) : "—"}</td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {!loading && dateRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-emerald-600 bg-emerald-100 font-semibold text-gray-900">
                <td className="sticky left-0 bg-emerald-100 px-4 py-3">TOTAL</td>
                {activeProducts.map((product) => {
                  const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-emerald-200 px-3 py-3 text-center">{number(value.kg)}</td>
                    </Fragment>
                  );
                })}
                <td className="bg-emerald-100" />
              </tr>
              <tr className="bg-emerald-50 font-medium text-gray-700">
                <td className="sticky left-0 bg-emerald-50 px-4 py-3">Rate</td>
                {activeProducts.map((product) => {
                  const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-emerald-100 px-3 py-3 text-center">{value.kg ? money(value.amount / value.kg) : "—"}</td>
                    </Fragment>
                  );
                })}
                <td className="bg-emerald-50" />
              </tr>
              <tr className="bg-emerald-50 font-medium text-gray-700">
                <td className="sticky left-0 bg-emerald-50 px-4 py-3">Amount</td>
                {activeProducts.map((product) => {
                  const value = productTotals.get(product.id) ?? { kg: 0, amount: 0 };
                  return (
                    <Fragment key={product.id}>
                      <td className="border-r border-emerald-100 px-3 py-3 text-center">{money(value.amount)}</td>
                    </Fragment>
                  );
                })}
                <td className="bg-emerald-50" />
              </tr>
              <tr className="border-t-2 border-emerald-600 bg-emerald-100 font-semibold text-gray-900">
                <td colSpan={columnCount} className="sticky left-0 bg-emerald-100 px-4 py-3">GRAND TOTAL</td>
                <td className="bg-emerald-100 px-3 py-3 text-center">{money(totals.amount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">{label}{children}</label>;
}

function Empty({ text, columns }: { text: string; columns: number }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center text-gray-400">{text}</td></tr>;
}
