# Lattice AI — Architecture & Product Reference

> **Purpose:** Single source of truth for vision, UX intent, **what the repo actually runs today**, and **where we’re headed**. Use this to avoid drift between pitch decks and code.

**See also:** [`GRAND_PLAN.md`](./GRAND_PLAN.md) (phased delivery + backlog), [`README.md`](./README.md) (setup & env).

---

## Table of contents

1. [Vision & positioning](#1-vision--positioning)
2. [User experience](#2-user-experience)
3. [Multi-agent brain (LangGraph, memory, knowledge retrieval)](#3-multi-agent-brain-langgraph-memory-knowledge-retrieval)
4. [Knowledge retrieval: PageIndex (vectorless)](#4-knowledge-retrieval-pageindex-vectorless)
5. [Technical stack: shipped vs target](#5-technical-stack-shipped-vs-target)
6. [Database: the three brains](#6-database-the-three-brains)
7. [External APIs](#7-external-apis)
8. [Business model (roadmap)](#8-business-model-roadmap)
9. [Document maintenance](#9-document-maintenance)

---

## 1. Vision & positioning

| | |
|--|--|
| **Vision** | **The operating system for physical reality** — democratize high-end manufacturing through vertical AI. |
| **Tagline** | *One prompt = one perfect part + one manual + one memory.* |
| **Goal** | A **vertical AI SaaS**: user types a sentence; the system handles chemistry/physics reasoning where applicable; user receives a **certified, ready-to-print industrial part** (geometry + documentation) in **under ~7 minutes**. |
| **Product name in UI** | **Lattice AI** — **Electric Blueprint** aesthetic (laboratory, not hospital). |

**What “success” means (product):** traceable outputs (STL + Builder Spec + evolving certificate story), guardrails (off-topic rejection, physics/simulation warnings), and a path to **memory** (past designs, material preferences) over time.

---

## 2. User experience

### 2.1 Aesthetic — “Tesla workshop” / Electric Industrial

- Deep **Prussian blue / charcoal** base, **arc cyan** accents, blueprint grid, monospace/datasheet typography for specs.
- Feels like a **high-tech lab**, not a sterile clinical UI.

### 2.2 Flow — “Croissant” method (conceptual)

| Step | User sees / gets |
|------|-------------------|
| **Prompt** | Natural language, e.g. *“Lightweight drone arm, holds 5kg.”* |
| **Preference** | ~**3 material options**; user picks one (human-in-the-loop). |
| **Engine** | **Lattice geometry** generated with parameters informed by requirements + chosen material. |
| **Hand-off** | Download **lattice STL** + **Builder Spec PDF** (the “recipe” to print without failing — product name; file may be `Builder_Spec.pdf` in packages). |
| **Guardrails** | **Chief engineer** behavior: reject non-mechanical nonsense (e.g. “jumping elephant”); block or warn on edits that violate physics (target — not all enforcement shipped yet). |

**Routing today:** Landing → **`/sign-in`** (GitHub) → **`/app`** (manifest prompt → Laboratory).

### 2.3 Mapping: concept → repo (today)

| Concept | In repo today |
|---------|----------------|
| Mind’s Eye / prompt | `frontend` — Thought Bar, Brain Feed |
| Material choice | Pipeline **interrupt** + UI material list |
| 3D view | **Three.js** (react-three-fiber), not Babylon.js |
| Builder Spec | PDF generator + right-hand datasheet panel |
| Dynamo (lattice constraints) | **Target:** dynamic allow/deny lattices, bounded sliders, re-validate pass/fail — [`docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md`](./docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md). **Shipped:** fixed pattern list + regenerate without fail-closed gate. |
| GitHub auth | OAuth + DB-backed session (`lattice.sid`) |

---

## 3. Multi-agent brain (LangGraph, memory, knowledge retrieval)

### 3.1 Target architecture (north star)

An **automated factory loop**, not a single chatbot:

| Capability | Intent |
|------------|--------|
| **Letta (or equivalent memory layer)** | Long-horizon **user memory**: e.g. *“You printed a drone in CF-Nylon last week — reuse machine settings?”* |
| **Knowledge retrieval (PageIndex)** | **Vectorless** retrieval over indexed docs via **PageIndex AI** — historical designs, material facts, internal playbooks (see §4). **Not** classic embedding + pgvector RAG. |
| **LangGraph** | **Orchestrator**: stateful graph, branching, human-in-the-loop, retries. |

**Target agent split (illustrative — not all separate binaries):**

| Agent | Role |
|-------|------|
| **Requirement** | Parse prompt → structured constraints (weight, load, env, process). |
| **Material** | Query catalogs/APIs; rank options; attach safety signals. |
| **Lattice** | Produce **3D lattice** (today: TS/Three pipeline; target may add Python/CAD kernels). |
| **Simulation** | Quick structural sanity / surrogate checks; **loop back** to lattice on failure (target). |
| **Validator** | Assemble Builder Spec; flag toxicity/compliance gaps. |

### 3.2 What exists in the repository today (truth)

| Piece | Status |
|-------|--------|
| **LangGraph** | **Yes** — `backend/src/graph/`: `StateGraph`, nodes (analyze → material search → **interrupt** for selection → lattice → Builder Spec → certificate), `MemorySaver` checkpointing for the run. |
| **Named “five agents” as separate services** | **No** — logic is **pipeline nodes**, not five deployed agents. |
| **Simulation ↔ lattice auto-loop** | **Partial / simplified** — estimates exist; full closed-loop “fail sim → regen lattice” is **aspirational**. |
| **Letta** | **Not integrated**. |
| **PageIndex (vectorless retrieval)** | **Not integrated** — see §4. |

**Rule of thumb:** Say **“LangGraph-orchestrated pipeline”** for accuracy today; reserve **“multi-agent factory with memory + PageIndex retrieval”** for the documented target.

---

## 4. Knowledge retrieval: PageIndex (vectorless)

### 4.1 Product decision

| | |
|--|--|
| **Chosen approach** | **PageIndex AI** — **vectorless** retrieval (structured / indexed knowledge), **not** classic **RAG** (embeddings + vector DB). |
| **Why document this** | Avoid building or maintaining an embedding pipeline (sentence-transformers, BERT, pgvector similarity) for primary knowledge access. PageIndex owns indexing + query semantics per their product. |
| **Env / credentials** | Follow **PageIndex** docs for API keys, index creation, and what to ingest (docs, specs, internal PDFs, etc.). No change to GitHub OAuth env vars for this. |

### 4.2 What we are explicitly *not* doing (for primary retrieval)

- **Not** defaulting on **pgvector** + chunk + embed + cosine search as the main knowledge path.
- **Not** requiring **BERT** or **sentence-transformers** in our stack for this layer unless a *separate* feature needs embeddings later.

### 4.3 Schema note (Prisma)

- Optional `embedding Json?` on **Material** / **Design** may remain for **future, non-PageIndex** use cases; it is **not** the chosen path for the main **knowledge retrieval** story. Prefer **PageIndex** for document/knowledge ground truth unless we add a concrete second use for vectors.

### 4.4 Decision log

| Date | Choice | Rationale |
|------|--------|-----------|
| Mar 2025 | **PageIndex (vectorless)** | Primary knowledge retrieval; avoid classic vector RAG complexity for v1+ roadmap. |

---

## 5. Technical stack: shipped vs target

**Critical:** The **target** stack below is a **credible forge architecture**; the **shipped** stack is what this monorepo **actually runs**. Migrating between them is a **deliberate project**, not implied by the vision doc alone.

### 5.1 Shipped (this repo)

| Layer | Technology |
|-------|------------|
| **Frontend** | React, Vite, TypeScript, Tailwind; **Three.js** via **@react-three/fiber** (not Babylon.js). |
| **Backend** | **Node.js**, **Express 5**, **TypeScript**. |
| **Orchestration** | **LangGraph** (`@langchain/langgraph`) + LangChain-adjacent usage. |
| **LLM** | Vertex AI (Gemini) / OpenAI fallback (requirement analysis, etc.). |
| **DB** | **PostgreSQL** + **Prisma**; `session` table for OAuth sessions. |
| **Real-time** | **Socket.IO** for job progress. |
| **Lattice generation** | TypeScript + **Three.js** exporters (not Build123d/CadQuery in this repo). |
| **Auth** | **GitHub OAuth** + express-session + connect-pg-simple. |

### 5.2 Target / aspirational (documented intent — optional migration)

| Layer | Stated intent |
|-------|----------------|
| **API** | Some teams prefer **FastAPI (Python 3.12+)** for ML/CAD adjacency; **not current**. |
| **Heavy compute** | **Modal / RunPod** (serverless GPUs) for intensive geometry or simulation. |
| **Lattice CAD** | **Build123d / CadQuery** (code-first CAD; reduces hallucinated geometry). |
| **FEA / surrogate** | **SfePy** or similar; “surrogate ML later.” |
| **3D in browser** | Some designs specify **Babylon.js**; **current repo uses Three.js**. |
| **DB hosting** | **Supabase** (or managed Postgres) for app data; **PostGIS** later for “print locally.” **pgvector** optional only if we add a separate embedding use case — **not** required for PageIndex retrieval. |
| **Blockchain** | Certificate hashing / **Solana** (example chain) — **lowest implementation priority** vs core SaaS, PageIndex integration, and forge; only after product-market fit or a concrete enterprise ask. Not in app logic today. |

### 5.3 When you change stack

Update **§5.1** in this file in the same PR as the code change, or add a short **ADR** (`docs/adr/`) and link it here.

---

## 6. Database: the three brains

Aligned with Prisma schema direction:

| Brain | Scope | Notes |
|-------|--------|--------|
| **Human** | Organizations, users, billing, credits | Multi-tenant path exists in schema. |
| **Material** | Chemical/physical properties, certifications; **knowledge** via **PageIndex** when integrated | Materials Project + PubChem in the loop today. Optional `embedding` field not used for primary retrieval. |
| **Design** | Projects, designs, versioning (parent/child), file hashes, **future chain-of-custody** | `Job` table is the operational “quick job” store today; migration toward full **Design** model is planned. |

---

## 7. External APIs

| API | Role |
|-----|------|
| **Materials Project** (`mp-api`) | Crystal structures, material IDs, physics-oriented data. |
| **PubChem (PUG REST)** | Toxicity / GHS-style safety signals — **guardrail** for hazardous suggestions. |
| **OPTIMADE** | Optional universal materials connector for edge cases (as needed). |
| **GitHub OAuth** | Identity for Lattice AI sessions. |

---

## 8. Business model (roadmap)

**Positioning (one line):** build toward the **“Visa of manufacturing”** — trust + routing between designers, documentation, and eventually physical fulfillment.

**Implementation priority (recommended):** **Phase 1 → Phase 3 (network) → Phase 2 on-chain last** — i.e. treat **Solana / blockchain certificates** as **last priority** unless an enterprise contract forces it earlier.

High-level phases (strategy — numbers are illustrative):

| Phase | Idea |
|-------|------|
| **1 — SaaS / open core (“the trap”)** | Strong hook on **lattice generation** (geometry) at low or free tier; monetize **Builder Spec** / the “recipe” so successful prints depend on paid documentation. |
| **2 — Enterprise moat (trust)** | Aerospace / auto-style **annual deals**; **Certificate.json**-style proof: hash **STL + Builder Spec** for liability and audit. **On-chain (e.g. Solana)** is an *option*, not the default v1. **Last priority** for engineering unless explicitly required. |
| **3 — Micro-factory network** | **“Print locally”** — route jobs to certified printers nearby; **Stripe Connect**; platform **take rate** on fulfilled prints (e.g. ~**10%** royalty model — tune per market). **PostGIS**-style geo fits here (see §5.2). |

Treat this as **strategy**; pricing and legal need separate review.

---

## 9. Document maintenance

| Action | Owner habit |
|--------|-------------|
| Change **shipped** stack or graph shape | Update **§3.2** and **§5.1** in the same change as code (or link an ADR). |
| Change PageIndex vs add embeddings | Update **§4**; if adding pgvector for a *new* feature, say so explicitly. |
| Shrink/grow backlog | Edit [`GRAND_PLAN.md`](./GRAND_PLAN.md). |

*Last updated: March 2025*
