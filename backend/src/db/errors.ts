/**
 * Database error types for API layer handling.
 */
export class JobNotFoundError extends Error {
  constructor(id: string) {
    super(`Job not found: ${id}`)
    this.name = 'JobNotFoundError'
  }
}

export class DbConnectionError extends Error {
  constructor(cause?: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause)
    super(`Database connection failed: ${message}`)
    this.name = 'DbConnectionError'
  }
}
