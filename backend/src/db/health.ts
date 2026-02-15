/**
 * Database health checks for startup and /api/health.
 * Verifies PostgreSQL connection and Job table presence.
 */
import { prisma } from './client.js'

export interface DbHealthResult {
  ok: boolean
  latencyMs?: number
  error?: string
}

/**
 * Run a minimal query to verify the database is reachable and Job table exists.
 * Returns latency in ms and any error.
 */
export async function checkDbHealth(): Promise<DbHealthResult> {
  const start = Date.now()
  try {
    await prisma.job.count()
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, latencyMs: Date.now() - start, error: message }
  }
}
