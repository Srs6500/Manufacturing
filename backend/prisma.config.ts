// Prisma config — loads .env.local first so migrations use the same env as the app
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config({ path: ['.env.local', '.env'] })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
