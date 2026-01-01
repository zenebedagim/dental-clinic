-- AlterTable: Add cardNo to Patient
ALTER TABLE "Patient" ADD COLUMN "cardNo" TEXT;

-- CreateIndex
CREATE INDEX "Patient_cardNo_idx" ON "Patient"("cardNo");

