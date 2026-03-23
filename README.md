# Manufacturing — Lattice AI

**One prompt = one perfect part + one manual + one memory — forever.**

Vertical AI SaaS: natural-language → manufacturable lattice structure in under 7 minutes.

**Product & engineering reference**

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — Vision (“OS for physical reality”), UX intent, **shipped vs target stack**, LangGraph truth vs multi-agent target, **knowledge via PageIndex (vectorless)** — not classic embedding RAG, DB “three brains,” APIs, business phases.
- **[`GRAND_PLAN.md`](./GRAND_PLAN.md)** — Phased delivery, backlog, operating rules.
- **[`docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md`](./docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md)** — Dynamo UI: dynamic lattice eligibility, bounded sliders, re-validate loop, `ui_constraints` API shape.
- **[`docs/CONTENT_POLICY.md`](./docs/CONTENT_POLICY.md)** — LLM content policy (weapons/explosives) before generation; `policy_gate` in LangGraph.
- **[`docs/ABUSE_PREVENTION_ROADMAP.md`](./docs/ABUSE_PREVENTION_ROADMAP.md)** — Evasion hardening, logging, DB flags, lawful escalation (staged with GRAND_PLAN B6 / Phase C).

## Repo structure

- **`frontend/`** — React + Vite + TypeScript, Three.js (react-three-fiber). **Electric Blueprint** UI: Mind's Eye (Thought Bar + Brain Feed) → Laboratory (3D viewport, Dynamo gauges, Builder Spec datasheet).
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

## Env

Create `backend/.env.local` with:

| Variable | Required | Description |
|----------|----------|--------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/lattice_ai` |
| `GOOGLE_CLOUD_PROJECT` | Yes (Vertex) | GCP project ID, e.g. `manufacturing-486502` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (Vertex) | Path to service account JSON key, e.g. `./google-credentials.json` |
| `GOOGLE_CLOUD_LOCATION` | No | Vertex AI region (default: `us-central1`) |
| `VERTEX_MODEL` | No | Model ID (default: `gemini-2.5-pro`) |
| `OPENAI_API_KEY` | Fallback | Used if Vertex is not configured or fails |
| `MP_API_KEY` | No | Materials Project API key; without it, curated materials are used |

**Vertex AI (service account):**
1. In [Google Cloud Console](https://console.cloud.google.com), select project `manufacturing-486502`.
2. Enable **Vertex AI API** (APIs & Services → Enable APIs).
3. IAM → Service Accounts → Create → name it e.g. `lattice-ai-vertex`.
4. Grant role **Vertex AI User** (or `roles/aiplatform.user`).
5. Keys → Add Key → Create new key → JSON. Download.
6. Save the JSON as `backend/google-credentials.json` (gitignored).
7. In `backend/.env.local`: `GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json` and `GOOGLE_CLOUD_PROJECT=manufacturing-486502`.

**Frontend:** Set `VITE_API_URL` only if the backend is on another host/port (e.g. production). Leave unset in dev.

- **PostgreSQL:** Create DB with `createdb lattice_ai`, then run `npm run db:migrate` in `backend/`.

- **API:** `GET /api/jobs` lists past jobs. `GET /api/jobs/:jobId` returns the stored job (prompt, status, requirements, result). Jobs can be `running`, `done`, or `failed` if the pipeline errors.
- **PubChem:** Toxicity/safety checks (no API key). Red Alert for hazardous materials.
- **pgvector:** Optional — only if you add a **separate** embedding feature. **Primary knowledge retrieval is PageIndex (vectorless),** not pgvector RAG. To experiment with vectors locally: `brew install pgvector` then `CREATE EXTENSION vector;` in your DB.

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
- **Laboratory:** After a result, layout: left = Dynamo (gauges, material options, lattice pattern selector), center = 3D wireframe view, right = Builder Spec (datasheet-style specs). Colors: Prussian Blue, Arc Blue, Copper Oxide for warnings.
- **My designs:** Clock icon in header opens history panel. Reopen past jobs, view prompt, status, date.
- **Toxicity:** Each material shows safety status ("No known hazards" or Red Alert for hazardous).
- **Lattice pattern:** Choose Strut grid, Octet truss, Honeycomb, or Gyroid. Apply & re-validate to regenerate.

---

*Electric Blueprint build — full multi-agent and blockchain later.*
