-- AlterTable
ALTER TABLE "customers" ADD COLUMN "serial_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_serial_number_key" ON "customers"("serial_number");
