import './env.js'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
// @ts-expect-error no types for connect-pg-simple
import connectPgSimple from 'connect-pg-simple'
import pg from 'pg'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { createReadStream, existsSync } from 'node:fs'
import archiver from 'archiver'
import {
  getGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  type GitHubUser,
} from './lib/github-auth.js'

interface SessionData {
  user?: GitHubUser
}
import { Command } from '@langchain/langgraph'
import { createJob, updateJob, getJob, listJobs } from './db/index.js'
import { checkDbHealth } from './db/health.js'
import { prisma } from './db/client.js'
import { getJobOutputPaths } from './lib/output-paths.js'
import { generateLattice } from './generators/lattice-generator.js'
import { generateBuildBible } from './generators/build-bible.js'
import { generateCertificate } from './generators/certificate.js'
import type { AnalyzedRequirements } from './agents/types.js'
import {
  getLatticePipelineGraph,
  isInterrupted,
  INTERRUPT,
  type MaterialInterruptValue,
} from './graph/index.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? FRONTEND_URL

/** Custom name avoids stale `connect.sid` cookies from earlier configs */
const SESSION_COOKIE_NAME = 'lattice.sid'

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const PgSession = connectPgSimple(session)

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
)
app.use(express.json())
const isProd = process.env.NODE_ENV === 'production'
app.use(
  session({
    name: SESSION_COOKIE_NAME,
    store: new PgSession({
      pool: pgPool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? 'lattice-ai-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: '/',
      // Omit domain in dev — Domain=localhost is ignored or flaky in some browsers
      ...(isProd && process.env.SESSION_COOKIE_DOMAIN
        ? { domain: process.env.SESSION_COOKIE_DOMAIN }
        : {}),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
    },
  })
)

const PORT = Number(process.env.PORT) || 3001

// ——— GitHub OAuth ———

app.get('/auth/github', (req, res) => {
  const redirectUri = `${FRONTEND_URL}/auth/github/callback`
  const authUrl = getGitHubAuthUrl(redirectUri)
  res.redirect(authUrl)
})

app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code as string
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?error=no_code`)
  }
  const redirectUri = `${FRONTEND_URL}/auth/github/callback`
  try {
    const token = await exchangeCodeForToken(code, redirectUri)
    const user = await fetchGitHubUser(token)
    ;(req.session as SessionData).user = user
    req.session.save((err) => {
      if (err) {
        console.error('[Auth] Session save error:', err)
        return res.redirect(`${FRONTEND_URL}/?error=session`)
      }
      res.redirect(`${FRONTEND_URL}/app`)
    })
  } catch (err) {
    console.error('[Auth] GitHub callback error:', err)
    res.redirect(`${FRONTEND_URL}/?error=auth_failed`)
  }
})

app.get('/api/auth/me', (req, res) => {
  const user = (req.session as SessionData).user
  if (!user) return res.status(401).json({ authenticated: false })
  res.json({ authenticated: true, user })
})

const clearSessionCookies = (res: express.Response) => {
  const base = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: isProd }
  res.clearCookie(SESSION_COOKIE_NAME, base)
  res.clearCookie('connect.sid', base)
  if (isProd && process.env.SESSION_COOKIE_DOMAIN) {
    res.clearCookie(SESSION_COOKIE_NAME, { ...base, domain: process.env.SESSION_COOKIE_DOMAIN })
    res.clearCookie('connect.sid', { ...base, domain: process.env.SESSION_COOKIE_DOMAIN })
  } else if (!isProd) {
    res.clearCookie(SESSION_COOKIE_NAME, { ...base, domain: 'localhost' })
    res.clearCookie('connect.sid', { ...base, domain: 'localhost' })
  }
}

function doLogoutAndRedirect(req: express.Request, res: express.Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout destroy error:', err)
      return res.redirect(`${FRONTEND_URL}/?error=logout_failed`)
    }
    clearSessionCookies(res)
    res.redirect(FRONTEND_URL)
  })
}

app.get('/auth/logout', (req, res) => {
  doLogoutAndRedirect(req, res)
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' })
    clearSessionCookies(res)
    res.json({ ok: true })
  })
})

// ——— API ———

app.get('/', (_req, res) => {
  res.json({
    service: 'lattice-ai-backend',
    docs: {
    health: 'GET /api/health',
    jobs: 'GET /api/jobs',
    job: 'GET /api/jobs/:jobId',
    lattice: 'GET /api/jobs/:jobId/lattice',
    generate: 'POST /api/generate',
  },
  })
})

app.get('/api/health', async (_req, res) => {
  const db = await checkDbHealth()
  res.json({
    ok: db.ok,
    service: 'lattice-ai-backend',
    db: db.ok ? { latencyMs: db.latencyMs } : { error: db.error },
  })
})

app.get('/api/jobs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Number(req.query.offset) || 0
    const status = req.query.status as 'running' | 'done' | 'failed' | undefined
    const { jobs, total } = await listJobs({ limit, offset, status })
    res.json({ jobs, total })
  } catch (err) {
    console.error('[API] listJobs', err)
    res.status(500).json({ error: 'Failed to list jobs' })
  }
})

app.get('/api/jobs/:jobId', async (req, res) => {
  try {
    const job = await getJob(req.params.jobId)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.json(job)
  } catch (err) {
    console.error('[API] getJob', err)
    res.status(500).json({ error: 'Failed to fetch job' })
  }
})

app.get('/api/jobs/:jobId/lattice', (req, res) => {
  const { jobId } = req.params
  getJob(jobId)
    .then((job) => {
      if (!job) return res.status(404).json({ error: 'Job not found' })
      if (job.status !== 'done') {
        return res.status(400).json({ error: 'Job not ready', status: job.status })
      }
      const paths = getJobOutputPaths(jobId)
      if (!job.latticePath || !existsSync(paths.lattice)) {
        return res.status(404).json({ error: 'Lattice file not available' })
      }
      res.setHeader('Content-Type', 'model/stl')
      res.setHeader('Content-Disposition', `inline; filename="lattice-${jobId}.stl"`)
      createReadStream(paths.lattice).pipe(res)
    })
    .catch((err) => {
      console.error('[API] lattice', err)
      if (!res.headersSent) res.status(500).json({ error: 'Failed to serve lattice' })
    })
})

app.get('/api/jobs/:jobId/download', async (req, res) => {
  const { jobId } = req.params
  const job = await getJob(jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.status !== 'done') {
    return res.status(400).json({ error: 'Job not ready for download', status: job.status })
  }

  const paths = getJobOutputPaths(jobId)
  const hasLattice = job.latticePath && existsSync(paths.lattice)
  const hasReport = job.reportPath && existsSync(paths.report)
  const hasCertificate = existsSync(paths.certificate)
  if (!hasLattice && !hasReport) {
    return res.status(404).json({ error: 'No output files available for this job' })
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('error', (err: unknown) => {
    console.error('[Download]', err)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create archive' })
  })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="lattice-ai-${jobId}.zip"`
  )
  archive.pipe(res)

  if (hasLattice) archive.file(paths.lattice, { name: 'lattice.stl' })
  if (hasReport) archive.file(paths.report, { name: 'Builder_Spec.pdf' })
  if (hasCertificate) archive.file(paths.certificate, { name: 'certificate.json' })

  await archive.finalize()
})

/** Regenerate lattice with tweaked params. Re-runs simulation and Builder Spec. */
app.post('/api/jobs/:jobId/regenerate', async (req, res) => {
  const { jobId } = req.params
  const job = await getJob(jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.status !== 'done') {
    return res.status(400).json({ error: 'Job not ready for regeneration', status: job.status })
  }

  const VALID_PATTERNS = ['strut-grid', 'octet-truss', 'honeycomb', 'gyroid'] as const
  const body = (req.body ?? {}) as {
    selectedMaterialId?: string
    pattern?: string
    density?: number
    strutRadius?: number
    gridX?: number
    gridY?: number
    gridZ?: number
  }

  const overrides: {
    selectedMaterialId?: string
    pattern?: (typeof VALID_PATTERNS)[number]
    density?: number
    strutRadius?: number
    gridX?: number
    gridY?: number
    gridZ?: number
  } = {}
  if (typeof body.selectedMaterialId === 'string') overrides.selectedMaterialId = body.selectedMaterialId
  if (typeof body.pattern === 'string' && VALID_PATTERNS.includes(body.pattern as (typeof VALID_PATTERNS)[number])) {
    overrides.pattern = body.pattern as (typeof VALID_PATTERNS)[number]
  }
  if (typeof body.density === 'number' && body.density >= 0.1 && body.density <= 1)
    overrides.density = body.density
  if (typeof body.strutRadius === 'number' && body.strutRadius >= 0.5 && body.strutRadius <= 5)
    overrides.strutRadius = body.strutRadius
  if (typeof body.gridX === 'number' && body.gridX >= 2 && body.gridX <= 12) overrides.gridX = body.gridX
  if (typeof body.gridY === 'number' && body.gridY >= 2 && body.gridY <= 12) overrides.gridY = body.gridY
  if (typeof body.gridZ === 'number' && body.gridZ >= 2 && body.gridZ <= 12) overrides.gridZ = body.gridZ

  try {
    const paths = getJobOutputPaths(jobId)
    const latticeResult = generateLattice(paths.lattice, job.requirements ?? null, overrides)
    if (!latticeResult) {
      return res.status(500).json({ error: 'Lattice regeneration failed' })
    }

    await generateBuildBible(
      paths.report,
      job.requirements ?? null,
      job.prompt,
      jobId,
      latticeResult.simulation
    )
    generateCertificate(
      paths.certificate,
      jobId,
      job.prompt,
      job.requirements ?? null,
      latticeResult.simulation
    )

    res.json({
      simulation: latticeResult.simulation,
      latticeParams: latticeResult.params,
    })
  } catch (err) {
    console.error('[API] regenerate', err)
    res.status(500).json({ error: 'Regeneration failed' })
  }
})

type ProgressStep =
  | 'analyzing'
  | 'material'
  | 'lattice'
  | 'simulating'
  | 'validating'
  | 'done'

/** Pending material selections: jobId -> resolver. Pipeline waits for user choice. */
const pendingMaterialSelections = new Map<
  string,
  { resolve: (materialId: string) => void; reject: () => void }
>()

const MATERIAL_SELECTION_TIMEOUT_MS = 60_000

function waitForMaterialSelection(
  jobId: string,
  materialOptions: Array<{ id: string }>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingMaterialSelections.delete(jobId)) {
        const fallback = materialOptions[0]?.id ?? 'pa12-cf'
        console.warn(`[Pipeline] Material selection timeout for ${jobId}, using ${fallback}`)
        resolve(fallback)
      }
    }, MATERIAL_SELECTION_TIMEOUT_MS)

    pendingMaterialSelections.set(jobId, {
      resolve: (materialId: string) => {
        clearTimeout(timeout)
        pendingMaterialSelections.delete(jobId)
        resolve(materialId)
      },
      reject: () => {
        clearTimeout(timeout)
        pendingMaterialSelections.delete(jobId)
        reject(new Error('Material selection cancelled'))
      },
    })
  })
}

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body as { prompt?: string }
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' })
  }
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await createJob(jobId, prompt)
  res.json({ jobId, message: 'Generation started. Connect via WebSocket for progress.' })

  const room = io.to(jobId)
  const emit = (step: ProgressStep, data?: Record<string, unknown>) => {
    room.emit('progress', { step, prompt, ...data })
  }

  // Give client time to subscribe, then run LangGraph pipeline
  setTimeout(async () => {
    const config = { configurable: { thread_id: jobId } }
    const graph = getLatticePipelineGraph()

    try {
      emit('analyzing')

      let result = await graph.invoke(
        {
          prompt,
          jobId,
          requirements: null,
          materialOptions: [],
          selectedMaterialId: null,
          latticeResult: null,
          reportPath: null,
          error: false,
        },
        config
      )

      // Human-in-the-loop: wait for material selection if interrupted
      if (isInterrupted<MaterialInterruptValue>(result)) {
        const interruptData = result[INTERRUPT][0]?.value
        if (interruptData) {
          emit('material', {
            requirements: interruptData.requirements ?? undefined,
            materialOptions: interruptData.materialOptions,
          })
          const selectedMaterialId = await waitForMaterialSelection(
            jobId,
            interruptData.materialOptions
          )
          emit('lattice')
          result = await graph.invoke(new Command({ resume: selectedMaterialId }), config)
        }
      }

      // Pipeline complete — use getState for authoritative full state (fixes Builder Spec empty on 2nd run)
      let state: {
        requirements?: unknown
        latticeResult?: { path?: string; simulation?: unknown; params?: unknown } | null
        reportPath?: string | null
        selectedMaterialId?: string | null
        error?: boolean
      }
      try {
        const snapshot = await graph.getState(config)
        state = (snapshot?.values ?? result) as typeof state
      } catch {
        state = result as typeof state
      }
      const latticePath = state.latticeResult?.path ?? null
      const reportPath = state.reportPath ?? null

      const lr = state.latticeResult
      const jobResult =
        !state.error && lr && lr.params && lr.simulation
          ? {
              latticeParams: lr.params as { pattern: string; density: number; strutRadius: number; gridX: number; gridY: number; gridZ: number },
              simulation: lr.simulation as { pattern: string; estimatedMassG: number; estimatedLoadKg: number; safetyFactor: number },
              selectedMaterialId: state.selectedMaterialId ?? null,
            }
          : undefined

      await updateJob(jobId, {
        status: state.error ? 'failed' : 'done',
        requirements: (state.requirements as AnalyzedRequirements | null | undefined) ?? undefined,
        latticePath,
        reportPath,
        result: jobResult,
      })
      emit('done', {
        requirements: state.requirements ?? null,
        jobId,
        latticePath,
        reportPath,
        simulation: state.latticeResult?.simulation ?? undefined,
        latticeParams: state.latticeResult?.params ?? undefined,
        selectedMaterialId: state.selectedMaterialId ?? undefined,
        error: state.error ?? false,
      })
    } catch (err) {
      console.error('[Pipeline]', err)
      await updateJob(jobId, 'failed')
      emit('done', { requirements: null, jobId, error: true })
    }
  }, 800)
})

// ——— WebSocket ———

io.on('connection', (socket) => {
  socket.on('subscribe', (jobId: string) => {
    if (typeof jobId === 'string') socket.join(jobId)
  })

  socket.on('material_selected', (data: { jobId?: string; materialId?: string }) => {
    const { jobId, materialId } = data ?? {}
    if (typeof jobId !== 'string' || typeof materialId !== 'string') return
    const pending = pendingMaterialSelections.get(jobId)
    if (pending) {
      pending.resolve(materialId)
    }
  })
})

// ——— Listen ———

httpServer.listen(PORT, async () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
  console.log(`WebSocket: ws://localhost:${PORT}`)
  const db = await checkDbHealth()
  if (db.ok) {
    console.log(`PostgreSQL: connected (${db.latencyMs}ms)`)
  } else {
    console.error(`PostgreSQL: failed — ${db.error}`)
  }
})

// ——— Graceful shutdown ———

async function shutdown() {
  console.log('Shutting down…')
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
