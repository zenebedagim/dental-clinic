-- Step 1: Fix existing appointments with null patientId by matching to patients by name
-- Update appointments that have a matching patient name
UPDATE "Appointment" a
SET "patientId" = p.id
FROM "Patient" p
WHERE a."patientId" IS NULL
  AND a."patientName" IS NOT NULL
  AND LOWER(TRIM(a."patientName")) = LOWER(TRIM(p.name))
  AND NOT EXISTS (
    SELECT 1 FROM "Appointment" a2 
    WHERE a2."patientId" = p.id 
    AND a2.id != a.id
  );

-- Step 2: For appointments with null patientId that couldn't be matched,
-- try to find by partial name match (first 10 characters)
UPDATE "Appointment" a
SET "patientId" = p.id
FROM "Patient" p
WHERE a."patientId" IS NULL
  AND a."patientName" IS NOT NULL
  AND LOWER(TRIM(SUBSTRING(a."patientName", 1, 10))) = LOWER(TRIM(SUBSTRING(p.name, 1, 10)))
  AND NOT EXISTS (
    SELECT 1 FROM "Appointment" a2 
    WHERE a2."patientId" = p.id 
    AND a2.id != a.id
  );

-- Step 3: Handle remaining appointments with null patientId
-- Create a placeholder "Unknown Patient" for orphaned appointments
DO $$
DECLARE
  unknown_patient_id UUID;
BEGIN
  -- Check if "Unknown Patient" already exists
  SELECT id INTO unknown_patient_id FROM "Patient" WHERE name = 'Unknown Patient' LIMIT 1;
  
  -- If not, create it
  IF unknown_patient_id IS NULL THEN
    INSERT INTO "Patient" (id, name, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'Unknown Patient', NOW(), NOW())
    RETURNING id INTO unknown_patient_id;
  END IF;
  
  -- Link orphaned appointments to Unknown Patient
  UPDATE "Appointment" 
  SET "patientId" = unknown_patient_id
  WHERE "patientId" IS NULL;
END $$;

-- Step 4: Change foreign key constraint from SET NULL to CASCADE
-- First, drop the existing foreign key constraint
ALTER TABLE "Appointment" 
DROP CONSTRAINT IF EXISTS "Appointment_patientId_fkey";

-- Step 5: Make patientId NOT NULL
ALTER TABLE "Appointment" 
ALTER COLUMN "patientId" SET NOT NULL;

-- Step 6: Recreate foreign key constraint with CASCADE (not SET NULL)
ALTER TABLE "Appointment" 
ADD CONSTRAINT "Appointment_patientId_fkey" 
FOREIGN KEY ("patientId") 
REFERENCES "Patient"("id") 
ON DELETE CASCADE;

