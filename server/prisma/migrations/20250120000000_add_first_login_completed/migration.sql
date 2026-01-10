-- AlterTable
ALTER TABLE "User" ADD COLUMN "firstLoginCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to set firstLoginCompleted based on passwordChanged status
-- If passwordChanged is true, assume first login was already completed
-- If passwordChanged is false, first login not completed yet
UPDATE "User" SET "firstLoginCompleted" = "passwordChanged" WHERE "firstLoginCompleted" = false;

