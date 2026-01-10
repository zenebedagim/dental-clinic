-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordChanged" BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to set passwordChanged to true (assume existing users have changed their passwords)
-- Only update if there are existing users (to avoid unnecessary updates for new installations)
-- This assumes existing users have already changed their passwords from default
UPDATE "User" SET "passwordChanged" = true WHERE "passwordChanged" = false AND "password" != '$2a$10$rKvGqNpJqNpJqNpJqNpJqO'; -- Update all except default password hash (placeholder)

