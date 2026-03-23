# Lattice AI — Grand Plan (delivery & backlog)

> **Full vision, UX spec, stack truth vs target, agents, knowledge (PageIndex vectorless), and APIs:** see **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** — read that first for alignment; this file is **how we ship** and **what’s next**.

---

## Vision (summary)

| | |
|--|--|
| **North-star vision** | **The operating system for physical reality** — vertical AI that democratizes high-end manufacturing. |
| **Tagline** | *One prompt = one perfect part + one manual + one memory.* |
| **Promise** | Plain-language prompt → manufacturable **lattice** + **Builder Spec** + traceable outputs, **~7 minutes**, with **guardrails** (safety, relevance, physics). |
| **Experience** | **Electric Blueprint** / Tesla-workshop lab aesthetic — not sterile clinical UI. |

Details: Croissant flow, guardrails, multi-agent **target**, **shipped vs aspirational stack**, **PageIndex (vectorless)** — not classic RAG — and DB “three brains” → all in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## How we proceed forward

We work in **thin vertical slices**: ship something usable, measure, then deepen. No big-bang rewrites without need.

### Phase A — **Foundation (current baseline)** ✅

| Step | Outcome |
|------|---------|
| A1 | Landing + app shell; Mind’s Eye → Laboratory flow |
| A2 | Requirement analysis, materials, lattice generation, simulation, Builder Spec PDF |
| A3 | PostgreSQL + Prisma; job history; WebSocket progress |
| A4 | GitHub OAuth; session store in DB; `/sign-in` gate; protected `/app` |

*This phase is the trunk everything else grows from.*

### Phase B — **Trust & correctness (next)**

| Step | What we do | Why |
|------|------------|-----|
| B1 | **Builder Spec depth** — richer PDF (sections, loads, safety, print notes) | Matches real engineering handoff |
| B2 | **Toxic / safety UX audit** — confirm warnings show post-prompt when PubChem flags risk | User trust |
| B3 | **Material list quality** — ensure top 3 options are *use-case-driven*; if the same 3 repeat everywhere, trace LLM vs API vs our filters | Credibility |
| B4 | **Off-topic gate** — reject non-manufacturing prompts (e.g. “cook pizza”) with a clear, kind message | Cost + clarity |
| B4b | **Content policy (shipped)** — LLM `policy_gate` blocks weapons/explosives etc.; see [`docs/CONTENT_POLICY.md`](./docs/CONTENT_POLICY.md) | Safety + trust |
| B5 | **Dynamo constraint UX** — dynamic lattice allow/deny + tooltips, server-driven slider envelopes, **Apply & re-validate** pass/fail (no STL swap on fail), structural banner — see [`docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md`](./docs/LATTICE_DYNAMO_CONSTRAINTS_SPEC.md) | UI matches physics envelope; trust |
| B6 | **Abuse / evasion hardening** — multi-layer policy, relevance gate, logging; roadmap for DB flags & lawful escalation — [`docs/ABUSE_PREVENTION_ROADMAP.md`](./docs/ABUSE_PREVENTION_ROADMAP.md) | Fewer disguised weapon/explosive prompts; audit trail |

*Order within B can shift; B1, B4, B5, and B6 are trust-adjacent.*

### Phase C — **Scale & product (later)**

- Tie **Job** model toward **Design / Project / Org** in Prisma (multi-tenant path already in schema).
- Production deploy: env split, `SESSION_SECRET`, cookie domain, `FRONTEND_URL`, GitHub OAuth app URLs.
- Optional: Supabase or managed Postgres, observability, rate limits, credits (`User.creditsRemaining`).
- **Abuse persistence (when B6 warrants it):** store high-severity policy blocks / repeat patterns per user — see [`docs/ABUSE_PREVENTION_ROADMAP.md`](./docs/ABUSE_PREVENTION_ROADMAP.md) §2 layer 5–6.

### Phase D — **Intelligence layer (when B/C justify it)**

Documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md) §3–4:

- **PageIndex AI (vectorless)** for knowledge retrieval — **not** embedding + pgvector RAG as the primary path.
- **Long-horizon memory** (e.g. Letta or equivalent) for “same settings as last week?” flows.
- **Richer LangGraph loops** (simulation failure → lattice revise), aligned with target agent split.

### Operating rules

1. **Migrations** for any persistent schema (sessions, jobs, future tables)—no “only in code” assumptions.
2. **Secrets only in env**—never commit `.env.local` or service account JSON.
3. **Commits**: scoped messages (`feat`, `fix`, `refactor`, `docs`) so history stays reversible.
4. **Stack or agent claims** in decks/pitches must match **§5.1 / §3.2** in [`ARCHITECTURE.md`](./ARCHITECTURE.md) unless flagged as **target**.

---

## Backlog (detailed)

### 1. Builder Spec — make it extensive

The Builder Spec PDF should read like a real engineering brief: more structure, numbers, load/safety narrative, and print-oriented notes—not a thin summary.

**Done when:** A stakeholder could hand the PDF to a shop or reviewer without opening the app.

---

### 2. Toxic warning display

After the user submits a manifest prompt, verify that **toxicity / safety signals** from PubChem (or related paths) actually surface in the UI when materials warrant it.

**Done when:** We’ve walked a few hazardous-adjacent examples and confirmed visible warnings + copy.

---

### 3. Material selection variety

**Question:** Are the three options always the *best three for this prompt*, or a recurring default set?

**If the same three repeat across unrelated prompts:** trace whether it’s Materials Project / LLM behavior, prompt design, or our selection code.

**Done when:** We can explain *why* each triplet was chosen—or we’ve fixed a real bug.

---

### 4. Rejection mechanism for off-topic prompts

Prompts that are clearly not manufacturing-related should **not** burn full pipeline cost. Respond with a short, helpful rejection and maybe a nudge toward valid examples.

**Done when:** Obvious off-topic inputs get a consistent, user-friendly block—not a silent failure or nonsense lattice.

---

## Document maintenance

- **Vision / stack / agents / PageIndex:** update [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **Phases + backlog:** update this file.
- *Last updated: March 2026*
