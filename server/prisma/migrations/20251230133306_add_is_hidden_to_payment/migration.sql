-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Payment_isHidden_idx" ON "Payment"("isHidden");
