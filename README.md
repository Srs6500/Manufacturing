# Manufacturing — Lattice AI

**One prompt = one perfect part + one manual + one memory — forever.**

Vertical AI SaaS: natural-language → manufacturable lattice structure in under 7 minutes.

## Repo structure

- **`frontend/`** — React + Vite + TypeScript, Three.js (react-three-fiber). **Electric Blueprint** UI: Mind's Eye (Thought Bar + Brain Feed) → Laboratory (3D viewport, Dynamo gauges, Build Bible datasheet).
- **`backend/`** — Node.js + Express 5 + TypeScript, Requirement Analyzer (Vertex AI / OpenAI), **PostgreSQL + Prisma** (ORM, migrations), WebSocket progress.

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (required for Vite 6+)
- **npm** 10+

## Quick start

1. **Backend** (run first so frontend can connect):
   ```bash
   cd backend && npm install && npm run dev
   ```
2. **Frontend** (in a second terminal):
   ```bash
   cd frontend && npm install && npm run dev
   ```

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:3001  
- **WebSocket:** proxied via Vite to ws://localhost:3001  

In dev, the frontend proxies `/api` and `/socket.io` to the backend, so you don’t need to set `VITE_API_URL`.

## Env (optional)

- **frontend:** copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` only if the backend is on another host/port (e.g. production).
- **backend:** copy `backend/.env.example` to `backend/.env.local`.
  - **Vertex AI (Gemini):** set `GOOGLE_CLOUD_PROJECT` (and run `gcloud auth application-default login`). Optional: `GOOGLE_CLOUD_LOCATION`, `VERTEX_MODEL`.
  - **OpenAI fallback:** set `OPENAI_API_KEY` if you don’t use Vertex.
  - **PostgreSQL (required):** set `DATABASE_URL` in `.env.local`. Create DB with `createdb lattice_ai`, then run `npm run db:migrate` in `backend/`.
- **API:** `GET /api/jobs/:jobId` returns the stored job (prompt, status, requirements). Jobs can be `running`, `done`, or `failed` if the pipeline errors.
- **pgvector:** For semantic search on materials/designs, run `brew install pgvector` then `CREATE EXTENSION vector;` in your DB.

## Database schema (PostgreSQL + Prisma)

| Table | Purpose |
|-------|---------|
| **Organization** | Multi-tenant (tier, Stripe, settings) |
| **User** | Auth metadata, org, role, credits |
| **Material** | Material catalog (formula, properties, certifications) |
| **MaterialTestData** | User-contributed test data |
| **Project** | Workspace (nested via `parent_project_id`) |
| **Design** | Generated lattice (prompt, requirements, file, simulation, blockchain) |
| **ManufacturingJob** | Print marketplace (requester, printer, status) |
| **Job** | Legacy quick jobs (will migrate to Design) |

**PostgreSQL setup:**
1. Install PostgreSQL (e.g. `brew install postgresql@16`).
2. Start Postgres: `brew services start postgresql@16` (or your version).
3. Create DB: `createdb lattice_ai`.
4. Set `DATABASE_URL` in `backend/.env.local`.
5. Run migrations: `cd backend && npm run db:migrate`.

Migrations: `npm run db:migrate` in `backend/`. Prisma Studio: `npm run db:studio`.

## UI (Electric Blueprint)

- **Mind's Eye:** Grid background, central “Thought Bar” (“What do you wish to manifest?”), Tesla-style loading bar, terminal-style Brain Feed while generating.
- **Laboratory:** After a result, layout: left = Dynamo (gauges placeholder), center = 3D wireframe view, right = Build Bible (datasheet-style specs). Colors: Prussian Blue, Arc Blue, Copper Oxide for warnings.

---

*Electric Blueprint build — full multi-agent and blockchain later.*
