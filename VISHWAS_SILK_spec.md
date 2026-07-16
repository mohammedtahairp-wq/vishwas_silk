# VISHWAS SILK — Technical Specification

## 1. Overview

VISHWAS SILK is a silk trading business that buys raw silk-related products (jhilli, jhilli3, kada, and other product types) directly from customers on an ongoing basis. A rider physically visits customers, collects products, and records the weight (kg) collected. VISHWAS SILK pays customers based on kg collected × a price/kg that admin sets individually per customer per product.

This spec defines a single web application with three role-based portals:

1. **Admin Dashboard** — manages customers, riders, products, pricing, assignments, and payments.
2. **Rider App** — lets a rider view assigned customers and log pickups (kg only, no pricing).
3. **Customer App** — lets a customer view their profile, pickup history, and monthly payment/transaction history.

All three portals are part of one React web app, with routes gated by role after login.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), React Router, Axios, Tailwind CSS |
| Backend | Node.js + Express (REST API) |
| Database | PostgreSQL |
| ORM | Prisma (or Sequelize/TypeORM — Prisma recommended) |
| Auth | Username + password, JWT-based sessions, role-based access control (RBAC) middleware |
| Password storage | bcrypt hashed |
| Hosting (initial) | Any Node-friendly host (Render/Railway/VPS) + managed Postgres |

Deliverable is a **web app**; a rider/customer mobile app can be layered on later using the same API (see Section 9).

## 3. Roles & Permissions

| Role | Can do |
|---|---|
| **Admin** | Full CRUD on customers, riders, products; set/update per-customer per-product price/kg; assign customers to riders; view all pickups; generate and mark monthly payments; view all reports. |
| **Rider** | View only customers assigned to them; log a pickup (select customer, select product, enter kg, date auto-set); view their own pickup history (kg only, **no price/amount ever shown**). |
| **Customer** | View own profile; view own pickups by day/month/product (kg-based); view own monthly transaction/payment history (amounts shown here only). **Cannot see price/kg at any point.** |

Price/kg is visible **only to Admin**. Neither rider nor customer ever sees price/kg. Customer sees final ₹ amounts only in the monthly transaction history, after admin finalizes/settles the month.

## 4. Data Model

### 4.1 `users` (shared login table, or split per role — pick one; spec assumes shared table with `role` enum)

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| username | string | unique |
| password_hash | string | bcrypt |
| role | enum | `admin`, `rider`, `customer` |
| linked_id | FK | points to `customers.id` or `riders.id` depending on role (nullable for admin) |
| status | enum | `active`, `inactive` |
| created_at | timestamp | |

### 4.2 `customers`

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| name | string | |
| phone | string | unique |
| address | text | |
| village_area | string | optional, useful for rider assignment |
| assigned_rider_id | FK → riders.id | nullable, one rider per customer (see 4.7 for multi-rider option) |
| status | enum | `active`, `inactive` |
| created_by | FK → users.id (admin) | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 4.3 `riders`

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| name | string | |
| phone | string | unique |
| status | enum | `active`, `inactive` |
| created_at | timestamp | |

### 4.4 `products`

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| name | string | e.g. Jhilli, Jhilli3, Kada |
| unit | string | default `kg` |
| status | enum | `active`, `inactive` |
| created_at | timestamp | |

### 4.5 `customer_product_prices`

Per-customer, per-product price/kg, set by admin. Supports price history (new row on change, `effective_from` date) so past pickups keep their original price even if admin updates pricing later.

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| customer_id | FK → customers.id | |
| product_id | FK → products.id | |
| price_per_kg | decimal | admin-only visibility |
| effective_from | date | |
| created_by | FK → users.id (admin) | |
| created_at | timestamp | |

Current price for a customer+product = row with the latest `effective_from <= today`.

### 4.6 `pickups`

Created by rider when collecting a product from a customer.

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| customer_id | FK → customers.id | |
| rider_id | FK → riders.id | |
| product_id | FK → products.id | |
| kg | decimal | entered by rider |
| pickup_date | date | defaults to today |
| price_per_kg_snapshot | decimal | copied from `customer_product_prices` at time of pickup; **hidden from rider/customer API responses** |
| amount | decimal | `kg × price_per_kg_snapshot`; **hidden from rider/customer API responses** |
| status | enum | `pending`, `included_in_settlement`, `paid` |
| created_at | timestamp | |

Note: `price_per_kg_snapshot` and `amount` exist in the DB row for admin's reporting/settlement use, but the API layer must strip these two fields from any response served to `rider` or `customer` roles.

### 4.7 `transactions` (monthly settlement / payment to customer)

Created by admin when finalizing a month's payment for a customer.

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| customer_id | FK → customers.id | |
| month | int | 1-12 |
| year | int | |
| total_kg | decimal | sum of kg across all products that month |
| total_amount | decimal | sum of pickup amounts that month |
| status | enum | `pending`, `paid` |
| paid_date | date | nullable until marked paid |
| created_by | FK → users.id (admin) | |
| created_at | timestamp | |

### 4.8 `transaction_line_items` (optional, product-level breakdown within a transaction)

| Field | Type | Notes |
|---|---|---|
| id | UUID/serial | PK |
| transaction_id | FK → transactions.id | |
| product_id | FK → products.id | |
| total_kg | decimal | |
| price_per_kg | decimal | |
| amount | decimal | |

This lets the customer's transaction history show a per-product breakdown for the month without exposing per-pickup pricing granularity.

**Assignment model note:** spec assumes one rider per customer at a time (`customers.assigned_rider_id`). If the business later needs multiple riders able to service one customer, replace with a `customer_rider_assignments` join table.

## 5. Core Business Rules

1. Only Admin creates customers, riders, and products, and sets price/kg (per customer, per product).
2. Price/kg is never returned by the API to `rider` or `customer` roles, in any endpoint, at any time.
3. A rider can only view/act on customers where `assigned_rider_id = rider.id`.
4. When a rider logs a pickup, the backend looks up the current `price_per_kg` for that customer+product, snapshots it onto the pickup row, and computes `amount` server-side. The rider's request/response never includes price or amount.
5. Customer-facing pickup views (daily/monthly/product-wise) show **kg and product only** — no price, no amount — since pickups aren't settled yet.
6. Monthly settlement: Admin runs a "generate settlement" action for a customer + month, which aggregates that month's `pickups` into a `transactions` row (and line items). Only after this step does an amount become visible to the customer, under **Transaction History**.
7. Admin can mark a transaction `paid` with a paid date; customer sees status (`pending`/`paid`) in transaction history.
8. All money fields are decimal(12,2); all kg fields are decimal(10,2).
9. Soft-delete / `status: inactive` preferred over hard delete for customers, riders, products (preserves historical pickup/transaction integrity).

## 6. API Endpoints (REST)

### Auth
- `POST /api/auth/login` — `{username, password}` → `{token, role}`
- `POST /api/auth/logout`

### Admin — Customers
- `POST /api/admin/customers` — create customer
- `GET /api/admin/customers` — list all (filter by rider, status)
- `GET /api/admin/customers/:id` — detail
- `PUT /api/admin/customers/:id` — update
- `PUT /api/admin/customers/:id/assign-rider` — `{rider_id}`
- `PUT /api/admin/customers/:id/status` — activate/deactivate

### Admin — Riders
- `POST /api/admin/riders`
- `GET /api/admin/riders`
- `GET /api/admin/riders/:id`
- `PUT /api/admin/riders/:id`
- `GET /api/admin/riders/:id/customers` — customers assigned to a rider

### Admin — Products
- `POST /api/admin/products`
- `GET /api/admin/products`
- `PUT /api/admin/products/:id`

### Admin — Pricing
- `POST /api/admin/pricing` — `{customer_id, product_id, price_per_kg, effective_from}`
- `GET /api/admin/pricing?customer_id=` — price history for a customer

### Admin — Pickups & Settlement
- `GET /api/admin/pickups` — all pickups, filterable by customer/rider/product/date range (includes price/amount)
- `POST /api/admin/settlements/generate` — `{customer_id, month, year}` → creates `transactions` row from that month's pickups
- `GET /api/admin/settlements` — list transactions, filterable
- `PUT /api/admin/settlements/:id/mark-paid` — `{paid_date}`

### Rider
- `GET /api/rider/customers` — customers assigned to logged-in rider (no price fields)
- `POST /api/rider/pickups` — `{customer_id, product_id, kg, pickup_date?}` (no price fields accepted or returned)
- `GET /api/rider/pickups` — rider's own pickup log, kg only

### Customer
- `GET /api/customer/profile` — own details
- `GET /api/customer/pickups?view=daily|monthly|product` — kg-based pickup history, no pricing
- `GET /api/customer/transactions` — monthly settlement history with amounts and status
- `GET /api/customer/transactions/:id` — line-item breakdown for one month

All non-auth endpoints require a valid JWT; middleware checks `role` and, for rider/customer, that the requested resource belongs to them.

## 7. Screens / Pages

### Admin Dashboard
- Login
- Dashboard home (summary: total customers, active riders, this month's total kg/amount pending settlement)
- Customers: list, create/edit form, detail view (pickup history + pricing)
- Riders: list, create/edit form, detail view (assigned customers, their pickup activity)
- Products: list, create/edit
- Pricing: set/update price per customer per product
- Pickups: full log with filters (date range, customer, rider, product)
- Settlements: generate monthly settlement per customer, view/mark paid, list all transactions

### Rider App
- Login
- My Customers (list assigned to me, with address/phone)
- Log Pickup (select customer → select product → enter kg → submit)
- My Pickup History (kg by date/customer/product — no amounts)

### Customer App
- Login
- My Profile
- My Pickups — tabs/filters: Daily, Monthly, By Product (kg quantities only)
- Transaction History — list of monthly settlements with total kg, total amount, status (pending/paid), paid date; drill into a month for per-product breakdown

## 8. Non-Functional Requirements

- Responsive layout (mobile-first for rider and customer apps, since they'll likely be used on phones via browser).
- Input validation on all forms (required fields, phone format, positive-only kg/price values).
- Server-side authorization checks on every endpoint — never trust client-supplied role or IDs.
- Price/amount field stripping enforced at the API serialization layer (not just hidden in UI), so rider/customer can't retrieve it via network inspection.
- Basic audit trail: `created_by`/`created_at` on customers, pricing, pickups, transactions.
- Environment-based config for DB connection and JWT secret (`.env`, never committed).

## 9. Future Scope (not in initial build)

- Native mobile apps (React Native) for rider and customer, reusing the same API.
- SMS/OTP login instead of username-password.
- Offline pickup entry for riders in low-connectivity areas, with sync-on-reconnect.
- Push/SMS notifications to customer when a monthly settlement is generated or marked paid.
- Export reports (CSV/PDF) from admin dashboard.
- Multi-rider-per-customer assignment support.
