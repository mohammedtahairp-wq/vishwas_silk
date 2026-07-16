-- A null customer_id identifies a product-wide global fallback price.
ALTER TABLE "customer_product_prices"
  ALTER COLUMN "customer_id" DROP NOT NULL;

DROP INDEX "customer_product_prices_customer_id_product_id_effective_fr_idx";

CREATE INDEX "customer_product_prices_customer_id_product_id_effective_fr_idx"
  ON "customer_product_prices"("customer_id", "product_id", "effective_from");

CREATE INDEX "customer_product_prices_product_id_effective_from_idx"
  ON "customer_product_prices"("product_id", "effective_from");
