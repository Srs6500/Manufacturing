-- Index for Job: list by creation time (newest first)
CREATE INDEX IF NOT EXISTS "idx_job_created_at" ON "Job"("createdAt" DESC);

-- Index for Job: filter by status (e.g. find running jobs)
CREATE INDEX IF NOT EXISTS "idx_job_status" ON "Job"("status");
