-- CreateEnum
CREATE TYPE "EmployeeCategory" AS ENUM ('sheet_machine', 'ovendry', 'khalla_jala', 'drivers_helpers');

-- CreateEnum
CREATE TYPE "SalaryPaymentType" AS ENUM ('advance', 'salary');

-- CreateEnum
CREATE TYPE "TransportExpenseCategory" AS ENUM ('diesel', 'repair');

-- CreateEnum
CREATE TYPE "MaintenanceExpenseCategory" AS ENUM ('food', 'machinery', 'others');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "category" "EmployeeCategory" NOT NULL,
    "monthly_salary" DECIMAL(12,2) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_payments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "SalaryPaymentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_expenses" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "category" "TransportExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_expenses" (
    "id" TEXT NOT NULL,
    "category" "MaintenanceExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_category_idx" ON "employees"("category");

-- CreateIndex
CREATE INDEX "salary_payments_employee_id_year_month_idx" ON "salary_payments"("employee_id", "year", "month");

-- CreateIndex
CREATE INDEX "transport_expenses_vehicle_id_expense_date_idx" ON "transport_expenses"("vehicle_id", "expense_date");

-- CreateIndex
CREATE INDEX "transport_expenses_expense_date_idx" ON "transport_expenses"("expense_date");

-- CreateIndex
CREATE INDEX "maintenance_expenses_expense_date_idx" ON "maintenance_expenses"("expense_date");

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_expenses" ADD CONSTRAINT "transport_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_expenses" ADD CONSTRAINT "maintenance_expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
