-- Add login_phone for phone-based auth
ALTER TABLE "users" ADD COLUMN "login_phone" TEXT;
CREATE UNIQUE INDEX "users_login_phone_key" ON "users"("login_phone");

-- Drop legacy username/password auth columns (replaced by phone OTP auth)
ALTER TABLE "users" DROP COLUMN IF EXISTS "username";
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
