-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementAction" ADD VALUE 'DEACTIVATE_MATERIAL';
ALTER TYPE "MovementAction" ADD VALUE 'REACTIVATE_MATERIAL';

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
