# VISHWAS SILK

Full-stack scaffold for the VISHWAS SILK silk-trading app: Admin / Rider / Customer portals in one React app, backed by an Express + Prisma + Postgres API. See `VISHWAS_SILK_spec.md` for the full spec this was built from.

## Quick start

### 1. Database

Either run Postgres locally via Docker:

```
docker compose up -d
```

...or point `backend/.env`'s `DATABASE_URL` at any Postgres instance (e.g. Neon, Supabase, Railway). Copy `backend/.env.example` to `backend/.env` and fill it in.

### 2. Backend

```
cd backend
npm install
npx prisma migrate deploy   # applies existing migrations
npx prisma db seed          # creates demo admin/rider/customers/products/prices
npm run dev                 # http://localhost:4000
```

Seeded login credentials (also printed by the seed script):

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| Rider | `rider1` | `Rider@123` |
| Customer | `customer1` | `Customer@123` |
| Customer | `customer2` | `Customer@123` |

### 3. Frontend

```
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

`frontend/.env` sets `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api`).

## Architecture notes

- Price/kg and pickup `amount` are stripped from every rider/customer-facing response by `backend/src/serializers/pickup.serializer.ts` — the single enforcement point for spec rule 2. See `pickup.serializer.test.ts` for the regression test.
- `GET /api/products` is a small addition beyond the spec's endpoint list: rider (Log Pickup) and customer screens need a product dropdown, and product name/unit carry no pricing info, so it's exposed to any authenticated role rather than admin-only.
- "Current price" lookups all go through one function: `backend/src/modules/admin/pricing/pricing.service.ts::currentPriceFor`.

## Not yet implemented (same pattern as an existing sibling — straightforward to add)

- `PUT /api/admin/customers/:id/status` (backend route exists; no UI wired yet — same shape as assign-rider)
- `PUT /api/admin/products/:id` (backend route exists; no UI wired yet)
- `GET /api/admin/settlements` list UI (settlements are tracked client-side per session on the Settlements page; the backend list endpoint exists but isn't fetched on load)
- `GET /api/customer/transactions/:id` per-product drill-in detail (list view exists; detail view does not)
- `POST /api/auth/logout` is a no-op 200 (stateless JWT — the frontend just discards the token locally)
- Admin dashboard summary widgets (`DashboardHome` is a placeholder)
- Multi-rider-per-customer, CSV/PDF export, SMS/OTP login, offline sync — all explicitly out of scope per spec section 9
