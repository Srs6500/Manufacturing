-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "chemical_formula" TEXT,
    "crystal_structure" TEXT,
    "density_g_cm3" DECIMAL,
    "youngs_modulus_gpa" DECIMAL,
    "yield_strength_mpa" DECIMAL,
    "melting_point_c" DECIMAL,
    "cost_usd_per_kg" DECIMAL,
    "printable_by" TEXT[],
    "certifications" TEXT[],
    "supplier_links" JSONB,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTestData" (
    "id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "test_type" TEXT NOT NULL,
    "measured_strength_mpa" DECIMAL,
    "measured_modulus_gpa" DECIMAL,
    "print_settings" JSONB,
    "test_date" DATE,
    "contributed_by" UUID,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTestData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MaterialTestData" ADD CONSTRAINT "MaterialTestData_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTestData" ADD CONSTRAINT "MaterialTestData_contributed_by_fkey" FOREIGN KEY ("contributed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
