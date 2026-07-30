-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('ORDER', 'QUOTE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ATTENDED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LandingGender" AS ENUM ('MALE', 'FEMALE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementAction" ADD VALUE 'CLAIM_PEDIDO';
ALTER TYPE "MovementAction" ADD VALUE 'RELEASE_PEDIDO';
ALTER TYPE "MovementAction" ADD VALUE 'CONVERT_PEDIDO';
ALTER TYPE "MovementAction" ADD VALUE 'CANCEL_PEDIDO';

-- CreateTable
CREATE TABLE "PublicRequest" (
    "id" TEXT NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "gender" "LandingGender" NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" "Size",
    "city" "City" NOT NULL,
    "quantity" INTEGER,
    "estimatedQuantity" TEXT,
    "usageContext" TEXT,
    "desiredTimeframe" TEXT,
    "additionalDetails" TEXT,
    "submissionIp" TEXT,
    "assignedSellerId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "convertedSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicRequest_status_city_idx" ON "PublicRequest"("status", "city");

-- CreateIndex
CREATE INDEX "PublicRequest_submissionIp_createdAt_idx" ON "PublicRequest"("submissionIp", "createdAt");

-- AddForeignKey
ALTER TABLE "PublicRequest" ADD CONSTRAINT "PublicRequest_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
