-- Backfill global prices for products created before global pricing was required.
-- Prefer the latest explicitly configured customer price; if none exists, use
-- the latest rate that was actually captured on a pickup.
WITH latest_customer_price AS (
  SELECT DISTINCT ON (product_id)
    product_id, price_per_kg, effective_from, created_by
  FROM customer_product_prices
  WHERE customer_id IS NOT NULL
  ORDER BY product_id, effective_from DESC, created_at DESC
),
latest_pickup_price AS (
  SELECT DISTINCT ON (product_id)
    product_id, price_per_kg_snapshot AS price_per_kg, pickup_date AS effective_from
  FROM pickups
  ORDER BY product_id, pickup_date DESC, created_at DESC
),
admin_user AS (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
),
candidates AS (
  SELECT
    p.id AS product_id,
    COALESCE(cp.price_per_kg, pp.price_per_kg) AS price_per_kg,
    COALESCE(cp.effective_from, pp.effective_from, CURRENT_DATE) AS effective_from,
    COALESCE(cp.created_by, a.id) AS created_by
  FROM products p
  CROSS JOIN admin_user a
  LEFT JOIN latest_customer_price cp ON cp.product_id = p.id
  LEFT JOIN latest_pickup_price pp ON pp.product_id = p.id
  WHERE COALESCE(cp.price_per_kg, pp.price_per_kg) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM customer_product_prices existing
      WHERE existing.product_id = p.id AND existing.customer_id IS NULL
    )
)
INSERT INTO customer_product_prices
  (id, customer_id, product_id, price_per_kg, effective_from, created_by, created_at)
SELECT
  gen_random_uuid()::text, NULL, product_id, price_per_kg, effective_from, created_by, CURRENT_TIMESTAMP
FROM candidates;
