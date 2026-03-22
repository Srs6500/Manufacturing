import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUTS_BASE = process.env.OUTPUTS_PATH ?? join(process.cwd(), 'data', 'outputs')

/**
 * Get the output directory path for a job. Creates it if it doesn't exist.
 */
export function getJobOutputDir(jobId: string): string {
  const dir = join(OUTPUTS_BASE, jobId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Paths for a job's output files.
 */
export function getJobOutputPaths(jobId: string): {
  dir: string
  lattice: string
  report: string
  certificate: string
} {
  const dir = getJobOutputDir(jobId)
  return {
    dir,
    lattice: join(dir, 'lattice.stl'),
    report: join(dir, 'Builder_Spec.pdf'),
    certificate: join(dir, 'certificate.json'),
  }
}
