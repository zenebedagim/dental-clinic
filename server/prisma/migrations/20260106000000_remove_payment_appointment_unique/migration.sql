-- Remove unique constraint from Payment.appointmentId to allow multiple payments per appointment
-- This enables creating 10+ payments for the same appointment

-- Drop the unique index
DROP INDEX IF EXISTS "Payment_appointmentId_key";

-- The relation is already changed in schema from one-to-one to one-to-many
-- No additional changes needed as the index removal allows multiple payments

