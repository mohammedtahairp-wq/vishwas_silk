-- CreateTable
CREATE TABLE "diesel_logs" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'kolar',
    "diesel_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diesel_amount" DECIMAL(12,2) NOT NULL,
    "start_km" DECIMAL(10,2) NOT NULL,
    "end_km" DECIMAL(10,2) NOT NULL,
    "km_run" DECIMAL(10,2) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diesel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diesel_logs_vehicle_id_diesel_date_idx" ON "diesel_logs"("vehicle_id", "diesel_date");

-- CreateIndex
CREATE INDEX "diesel_logs_rider_id_diesel_date_idx" ON "diesel_logs"("rider_id", "diesel_date");

-- CreateIndex
CREATE INDEX "diesel_logs_unit_diesel_date_idx" ON "diesel_logs"("unit", "diesel_date");

-- AddForeignKey
ALTER TABLE "diesel_logs" ADD CONSTRAINT "diesel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diesel_logs" ADD CONSTRAINT "diesel_logs_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diesel_logs" ADD CONSTRAINT "diesel_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
