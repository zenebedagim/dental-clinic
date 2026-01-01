-- AlterTable: Add receptionistId to Appointment
ALTER TABLE "Appointment" ADD COLUMN "receptionistId" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_receptionistId_idx" ON "Appointment"("receptionistId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_receptionistId_fkey" FOREIGN KEY ("receptionistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add showDetailedBilling and detailedBillingEnabledBy to Payment
ALTER TABLE "Payment" ADD COLUMN "showDetailedBilling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Payment" ADD COLUMN "detailedBillingEnabledBy" TEXT;

-- CreateIndex
CREATE INDEX "Payment_showDetailedBilling_idx" ON "Payment"("showDetailedBilling");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_detailedBillingEnabledBy_fkey" FOREIGN KEY ("detailedBillingEnabledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

