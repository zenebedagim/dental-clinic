-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordChangedBy" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "adminVisiblePassword" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordChangedByUserFlag" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_createdBy_idx" ON "User"("createdBy");
CREATE INDEX "User_passwordChangedBy_idx" ON "User"("passwordChangedBy");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_passwordChangedBy_fkey" FOREIGN KEY ("passwordChangedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

