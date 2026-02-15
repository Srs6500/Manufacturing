/**
 * Load env first — must be imported before any module that reads process.env.
 * ESM hoists imports, so we use a dedicated module to ensure dotenv runs
 * before db/client and other env-dependent code.
 */
import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({ path: [resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '.env')] })
