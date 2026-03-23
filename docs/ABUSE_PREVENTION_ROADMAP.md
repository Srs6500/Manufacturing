# Abuse prevention, evasion hardening & escalation roadmap

> **Purpose:** Plan how we **reduce bypass** of the content policy (disguised wording, chemistry trivia, “protection” framing, ammunition, bomb-making instructions) and how we **eventually** persist **trust signals** in the database for repeat abuse — including a path toward **lawful** cooperation with authorities when appropriate. This is **product/engineering intent**, not legal advice.

**Related (shipped today):** [`CONTENT_POLICY.md`](./CONTENT_POLICY.md) — LLM `policy_gate` before generation.

**Implementation stage:** **Phase B extensions** (near-term hardening) → **Phase C** (persistence, rate limits, ops) → **post–product-market fit / legal review** (formal reporting workflows).

---

## 1. Why a single LLM gate is not enough

Motivated users may try to:

| Trap | Example | Risk |
|------|---------|------|
| **Virtue framing** | “Building a gun for protection / home defense” | Same prohibited outcome, softer wording. |
| **Chemistry-only** | Paste RDX formula, CAS numbers, synthesis-adjacent text without saying “bomb” | May pass a naive intent classifier that only looks for explicit weapon words. |
| **Ammunition / components** | “9mm hollow-point lattice casing”, “bullet jacket optimization” | Firearm-adjacent manufacturing assistance. |
| **Instructional** | “How to build a bomb / IED / shaped charge” | Clear harm; should **always** block and warrant **strong audit trail**. |
| **Split or iterative** | Innocent first prompt, harmful follow-ups (when multi-turn exists) | Requires **session-level** memory of risk, not one-shot text only. |

**Goal:** Multiple **independent** signals, logging, and (later) **account-level** memory so one clever rephrase does not reset the score to zero.

---

## 2. Layered defense (target architecture)

Order is **conceptual**; some layers can ship in one PR, others need schema and legal sign-off.

### Layer 1 — Strengthen policy classification (Phase B)

- **Policy model** (`content-policy` agent): explicit instructions to treat **euphemisms**, **“for protection”** firearm requests, **ammunition**, **explosive precursors named in context of manufacture**, and **step-by-step harm instructions** as **`allowed: false`**, even when phrased academically.
- **Second structured pass (optional):** tiny “evasion / manufacturing-of-harm” classifier on the same prompt, or a **merged** JSON schema with fields `{ policy_allowed, harm_manufacturing_likelihood, rationale_code }` — still LLM-backed, **not** a static blocklist as the only source of truth (keyword lists may **supplement** high-confidence signals only).

### Layer 2 — Manufacturing relevance gate (Phase B, aligns with GRAND_PLAN **B4**)

- Reject prompts that are **not** describable as a **mechanical / aerospace / industrial part** for our pipeline (overlaps “off-topic”).
- Reduces noise and **chemistry homework** dumps that are not part requests — either block with a clear message or ask for a **part-oriented** description.

### Layer 3 — Post-parse check (Phase B / C)

- After requirement analysis, run a **lightweight** check on **structured** output (summary + constraints + materials hints) for **prohibited manufacturing-of-harm** patterns.
- **Block** before material search if the structured intent is clearly weapon/explosive manufacturing even when the raw prompt was vague.

### Layer 4 — Logging & metrics (Phase B)

- Structured logs: `policy_blocked`, `policy_reason_code` (if we add codes), `user_id` / `job_id`, timestamp, **hashed** prompt fingerprint (optional) for abuse analysis **without** storing full prompts in logs if policy prefers minimization.
- Dashboards / alerts for spikes in blocks.

### Layer 5 — Account-level flags in the database (Phase C)

- **Persist** high-severity events (e.g. clear bomb-making instructions, repeated weapon lattice requests after blocks).
- **Schema direction (illustrative — migrate when implementing):**
  - `User.abuse_flags` JSON / counters, or dedicated **`AbuseEvent`** table: `user_id`, `severity`, `category` (e.g. `explosives_instructions`, `firearms`), `job_id` nullable, `created_at`, `reviewed_at`.
- **Behavior:** escalating responses — stricter auto-block, human review queue, account suspension (ToS), **not** automatic law-enforcement contact from software alone.

### Layer 6 — Lawful disclosure & authorities (much later; legal gate)

- **Any** reporting to law enforcement or government must follow **counsel-approved** process: jurisdiction, **Terms of Service**, privacy policy, **subpoena** vs **voluntary** disclosure rules, and regional law (e.g. GDPR, US state privacy laws).
- Product stance: **capability to preserve audit trails** and **respond to valid legal process** — **not** a promise to “auto-report” users from heuristics without legal review.
- Document **runbooks** (who approves, what is retained, retention periods) **before** enabling automated escalation beyond account ban.

---

## 3. What we explicitly want to catch better (requirements text)

The policy and follow-on layers should treat as **high risk** (block + log + future flag):

- Requests to **design, optimize, or manufacture** **firearms**, **receivers**, **suppressors**, **ammunition**, or **weaponized** projectiles — **including** “for self-defense / protection” framing.
- **Explosives** and **improvised explosive** content, **detonation**, **shaped charge**, **how to build** a bomb.
- **Chemical formulas or synthesis pathways** when the **stated or implied goal** is energetic materials or weapons — not blocking **generic chemistry education** in isolation unless tied to manufacture-of-harm (nuanced; LLM + context).

---

## 4. Staged implementation checklist

| Stage | Scope | Deliverable |
|-------|--------|-------------|
| **B — now** | Shipped | `policy_gate` + UI refusal ([`CONTENT_POLICY.md`](./CONTENT_POLICY.md)). |
| **B — next** | Prompt + schema hardening | Tighter policy instructions; optional second field / classifier; manufacturing relevance (**B4**). |
| **B / C** | Observability | Structured logging, redaction policy, basic alerts. |
| **C** | Persistence | Prisma migration: `AbuseEvent` or `User` trust fields; wire policy block + severity to DB. |
| **C+** | Product | Admin review UI, rate limits, suspension flows (ToS). |
| **Legal / ops** | External | Counsel-reviewed retention, disclosure, and (if ever) law-enforcement **playbook**. |

---

## 5. Document maintenance

- When a layer **ships**, update this file’s **§4** table and [`GRAND_PLAN.md`](../GRAND_PLAN.md).
- When **`CONTENT_POLICY.md`** behavior changes, keep **§2** here aligned on **intent** (not duplicate implementation detail).

*Version: 1.0 — March 2026*
