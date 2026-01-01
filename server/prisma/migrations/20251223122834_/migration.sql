-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Treatment" ADD COLUMN     "affectedTeeth" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "clinicalExam" JSONB,
ADD COLUMN     "clinicalTests" JSONB,
ADD COLUMN     "dentalHistory" TEXT,
ADD COLUMN     "diagnosisCode" TEXT,
ADD COLUMN     "diagnosisNotes" TEXT,
ADD COLUMN     "historyPresentIllness" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postTreatment" JSONB,
ADD COLUMN     "procedureLogs" JSONB,
ADD COLUMN     "secondaryDiagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "socialHistory" TEXT,
ADD COLUMN     "toolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vitalSigns" JSONB;

-- AlterTable
ALTER TABLE "XRay" ADD COLUMN     "findings" JSONB,
ADD COLUMN     "technique" TEXT,
ADD COLUMN     "teeth" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "urgency" TEXT,
ADD COLUMN     "xrayType" TEXT;

-- CreateIndex
CREATE INDEX "Appointment_patientName_idx" ON "Appointment"("patientName");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE INDEX "Treatment_diagnosisCode_idx" ON "Treatment"("diagnosisCode");

-- CreateIndex
CREATE INDEX "XRay_xrayType_idx" ON "XRay"("xrayType");
