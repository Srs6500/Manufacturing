-- CreateTable
CREATE TABLE "ManufacturingJob" (
    "id" UUID NOT NULL,
    "design_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "printer_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "price_usd" DECIMAL,
    "platform_fee_usd" DECIMAL,
    "printer_latitude" DECIMAL,
    "printer_longitude" DECIMAL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ManufacturingJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManufacturingJob" ADD CONSTRAINT "ManufacturingJob_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "Design"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingJob" ADD CONSTRAINT "ManufacturingJob_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingJob" ADD CONSTRAINT "ManufacturingJob_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
