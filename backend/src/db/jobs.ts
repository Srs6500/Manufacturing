import { Prisma } from '@prisma/client'
import { prisma } from './client.js'
import { JobNotFoundError } from './errors.js'
import type { AnalyzedRequirements } from '../agents/types.js'

export type JobStatus = 'running' | 'done' | 'failed'

/** Stored when job completes; used for reopen. */
export interface JobResult {
  latticeParams?: { pattern: string; density: number; strutRadius: number; gridX: number; gridY: number; gridZ: number }
  simulation?: Record<string, unknown>
  selectedMaterialId?: string | null
  /** Builder Spec Section 1.0 canonical hash */
  builderSpecDocumentSha256?: string
  /** LLM content policy blocked (weapons, explosives, etc.) */
  policyBlocked?: boolean
  policyMessage?: string
}

export interface JobRecord {
  id: string
  prompt: string
  status: JobStatus
  requirements: AnalyzedRequirements | null
  latticePath: string | null
  reportPath: string | null
  result: JobResult | null
  createdAt: number
  updatedAt: number
}

function rowToRecord(row: {
  id: string
  prompt: string
  status: string
  requirements: unknown
  latticePath: string | null
  reportPath: string | null
  result: unknown
  createdAt: Date
  updatedAt: Date
}): JobRecord {
  return {
    id: row.id,
    prompt: row.prompt,
    status: row.status as JobStatus,
    requirements: row.requirements as AnalyzedRequirements | null,
    latticePath: row.latticePath,
    reportPath: row.reportPath,
    result: (row.result as JobResult | null) ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

/**
 * Create a new job (status: running).
 * @throws Error if DB fails or duplicate id (P2002)
 */
export async function createJob(id: string, prompt: string): Promise<void> {
  await prisma.job.create({
    data: {
      id,
      prompt,
      status: 'running',
      updatedAt: new Date(),
    },
  })
}

export interface UpdateJobOptions {
  status: JobStatus
  requirements?: AnalyzedRequirements | null
  latticePath?: string | null
  reportPath?: string | null
  result?: JobResult | null
}

/**
 * Update job status and optionally store requirements, latticePath, reportPath.
 * @throws JobNotFoundError if job does not exist (P2025)
 */
export async function updateJob(
  id: string,
  statusOrOptions: JobStatus | UpdateJobOptions,
  requirements?: AnalyzedRequirements | null
): Promise<void> {
  const opts: UpdateJobOptions =
    typeof statusOrOptions === 'string'
      ? { status: statusOrOptions, requirements }
      : statusOrOptions

  try {
    await prisma.job.update({
      where: { id },
      data: {
        status: opts.status,
        requirements: opts.requirements != null ? (opts.requirements as object) : undefined,
        latticePath: opts.latticePath !== undefined ? opts.latticePath : undefined,
        reportPath: opts.reportPath !== undefined ? opts.reportPath : undefined,
        result: opts.result !== undefined ? (opts.result as object) : undefined,
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new JobNotFoundError(id)
    }
    throw err
  }
}

/**
 * Get a job by id. Returns null if not found.
 */
export async function getJob(id: string): Promise<JobRecord | null> {
  const row = await prisma.job.findUnique({
    where: { id },
  })
  if (!row) return null
  return rowToRecord(row)
}

/**
 * Get a job by id. Throws JobNotFoundError if not found.
 */
export async function getJobOrThrow(id: string): Promise<JobRecord> {
  const row = await prisma.job.findUnique({
    where: { id },
  })
  if (!row) throw new JobNotFoundError(id)
  return rowToRecord(row)
}

export interface ListJobsOptions {
  limit?: number
  offset?: number
  status?: JobStatus
  orderBy?: 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface ListJobsResult {
  jobs: JobRecord[]
  total: number
}

/**
 * List jobs with pagination and optional status filter.
 */
export async function listJobs(options: ListJobsOptions = {}): Promise<ListJobsResult> {
  const { limit = 20, offset = 0, status, orderBy = 'createdAt', order = 'desc' } = options

  const where = status ? { status } : {}
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { [orderBy]: order },
      take: Math.min(limit, 100),
      skip: offset,
    }),
    prisma.job.count({ where }),
  ])

  return {
    jobs: jobs.map(rowToRecord),
    total,
  }
}
