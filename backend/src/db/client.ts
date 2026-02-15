/**
 * Shared Prisma client instance.
 * Loaded after dotenv so DATABASE_URL is available.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it in .env.local')
}

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })
