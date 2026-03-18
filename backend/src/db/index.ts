/**
 * Database layer — PostgreSQL via Prisma.
 *
 * Exports:
 * - client: Prisma instance
 * - Job CRUD: createJob, updateJob, getJob, getJobOrThrow, listJobs
 * - Health: checkDbHealth
 * - Errors: JobNotFoundError
 */
export { prisma } from './client.js'
export { checkDbHealth } from './health.js'
export type { DbHealthResult } from './health.js'
export { JobNotFoundError, DbConnectionError } from './errors.js'
export {
  createJob,
  updateJob,
  getJob,
  getJobOrThrow,
  listJobs,
  type JobStatus,
  type JobRecord,
  type JobResult,
  type UpdateJobOptions,
  type ListJobsOptions,
  type ListJobsResult,
} from './jobs.js'
