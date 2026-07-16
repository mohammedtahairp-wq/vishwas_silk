-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- Seed cities from cities already referenced by existing customers / riders
INSERT INTO "cities" ("id", "name")
SELECT gen_random_uuid(), v FROM (
    SELECT DISTINCT TRIM(village_area) AS v FROM "customers" WHERE village_area IS NOT NULL AND TRIM(village_area) <> ''
    UNION
    SELECT DISTINCT TRIM(village_area) AS v FROM "riders" WHERE village_area IS NOT NULL AND TRIM(village_area) <> ''
) AS existing
ON CONFLICT ("name") DO NOTHING;
