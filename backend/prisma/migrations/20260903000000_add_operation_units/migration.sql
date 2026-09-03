-- Add Unit enum for segregating operations across the 3 production units (Kolar, Sidlagatta, Ramnagar)

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('kolar', 'sidlagatta', 'ramnagar');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "unit" "Unit" NOT NULL DEFAULT 'kolar';

-- AlterTable
ALTER TABLE "salary_payments" ADD COLUMN "unit" "Unit" NOT NULL DEFAULT 'kolar';

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "unit" "Unit" NOT NULL DEFAULT 'kolar';

-- AlterTable
ALTER TABLE "transport_expenses" ADD COLUMN "unit" "Unit" NOT NULL DEFAULT 'kolar';

-- AlterTable
ALTER TABLE "maintenance_expenses" ADD COLUMN "unit" "Unit" NOT NULL DEFAULT 'kolar';

-- CreateIndex
CREATE INDEX "employees_unit_idx" ON "employees"("unit");

-- CreateIndex
CREATE INDEX "salary_payments_unit_year_month_idx" ON "salary_payments"("unit", "year", "month");

-- CreateIndex
CREATE INDEX "vehicles_unit_idx" ON "vehicles"("unit");

-- CreateIndex
CREATE INDEX "transport_expenses_unit_expense_date_idx" ON "transport_expenses"("unit", "expense_date");

-- CreateIndex
CREATE INDEX "maintenance_expenses_unit_expense_date_idx" ON "maintenance_expenses"("unit", "expense_date");
