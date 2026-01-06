-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TREATMENT_SENT_TO_RECEPTION';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "treatmentId" TEXT;

-- AlterTable
ALTER TABLE "Treatment" ADD COLUMN     "paymentVisibilityType" TEXT,
ADD COLUMN     "sentByDentistId" TEXT,
ADD COLUMN     "sentToReception" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentToReceptionAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_treatmentId_idx" ON "Payment"("treatmentId");

-- CreateIndex
CREATE INDEX "Treatment_sentToReception_idx" ON "Treatment"("sentToReception");

-- CreateIndex
CREATE INDEX "Treatment_paymentVisibilityType_idx" ON "Treatment"("paymentVisibilityType");

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_sentByDentistId_fkey" FOREIGN KEY ("sentByDentistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
