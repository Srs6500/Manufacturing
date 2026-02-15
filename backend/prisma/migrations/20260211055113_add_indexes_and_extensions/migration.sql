-- pgvector: Run manually after `brew install pgvector`:
--   CREATE EXTENSION IF NOT EXISTS vector;

-- Index for designs: fast lookup by project + recency
CREATE INDEX IF NOT EXISTS idx_designs_project_created ON "Design"("project_id", "created_at" DESC);

-- Index for materials: fast lookup by name
CREATE INDEX IF NOT EXISTS idx_materials_name ON "Material"("name");

-- Index for manufacturing_jobs: status lookup
CREATE INDEX IF NOT EXISTS idx_manufacturing_jobs_status ON "ManufacturingJob"("status");

-- Index for organizations: slug lookup
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON "Organization"("slug");
