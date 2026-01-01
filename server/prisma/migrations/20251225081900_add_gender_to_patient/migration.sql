-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "gender" TEXT;
