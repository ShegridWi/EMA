-- CreateTable
CREATE TABLE "MaterialStockMovement" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityBefore" DECIMAL(10,2) NOT NULL,
    "quantityAfter" DECIMAL(10,2) NOT NULL,
    "delta" DECIMAL(10,2) NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialStockMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialStockMovement" ADD CONSTRAINT "MaterialStockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialStockMovement" ADD CONSTRAINT "MaterialStockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
