# Lattice Dynamo — Constraint UX & API Specification

> **Purpose:** Define the **Dynamo** panel behavior: AI-driven lattice eligibility, bounded parametric sliders, **Apply & re-validate** loop, and structural override messaging. This doc is a **target specification** for implementation; it does **not** replace [`ARCHITECTURE.md`](../ARCHITECTURE.md) or [`GRAND_PLAN.md`](../GRAND_PLAN.md).

**Status:** Target — partial overlap with shipped UI (static pattern list, fixed slider ranges, regenerate without pass/fail gate).

**Related:** [`BUILDER_SPEC_REQUIREMENTS.md`](./BUILDER_SPEC_REQUIREMENTS.md) (PDF handoff), [`ARCHITECTURE.md`](../ARCHITECTURE.md) §3 (LangGraph pipeline).

---

## 1. Goals

1. **Never present a “dumb” 0–10 mm slider** — limits come from **printer resolution + surrogate/FEA physics** and **geometry sanity** (e.g. strut too thick → lattice becomes a near-solid block).
2. **Lattice type is not a static four-option menu forever** — the backend returns **which topologies are viable** for this prompt, material, and load, plus **reasons** for excluded types.
3. **Apply & re-validate** is the **authority** — failed validation **does not** update the 3D preview or “bless” the part until the engine passes (or the user accepts a documented override flow, future).
4. **Trust through transparency** — greyed options + tooltips explain *why* a lattice failed (e.g. load, shear), without claiming more precision than the simulation layer actually provides.

---

## 2. Dynamic lattice dropdown (“lattice pruning”)

### 2.1 Behavior

- After the initial **requirements + material + envelope** pass, the backend evaluates a **catalog** of lattice types (see §7) against current constraints (target load, material, bounding volume, process class).
- **`allowed_lattices`:** selectable in the dropdown (normal styling).
- **`disabled_lattices`:** remain visible but **greyed out** / non-selectable.
- **Hover / focus:** tooltip shows human-readable **`reason`** (e.g. “Disabled: strut-grid fails lateral shear index at 12.3 kg for this material envelope”).
- **`recommended_lattice`:** pre-selected default when opening Dynamo after generation.

### 2.2 Honesty bar

- While the backend uses **surrogate** models, tooltips should use language like **“surrogate screening”** or **“initial structural index”** unless/until **real quick-FEA** backs the message.
- When upgrading to solver-backed checks, update copy to match (e.g. “von Mises exceeds yield at stated load”).

---

## 3. Parametric bounded sliders (“safe envelope”)

### 3.1 Behavior

- Sliders **min** / **max** are **not** global constants — they are computed per job (material, load, pattern, bbox).
- **Minimum strut radius (example logic):** `max(printer_floor, physics_floor)` — e.g. LPBF powder fusion floor vs surrogate “snap” threshold under declared load.
- **Maximum strut radius:** capped so the lattice does not **fill solid** (relative density / strut intersection rules — product-defined formula).
- **`current`** reflects the active value (from last successful validation or initial generation).

### 3.2 Visual language (Electric Blueprint)

- **Track:** **Cyan** in the **safe zone** (between min and max).
- **Edge behavior:** when the thumb is within a defined **margin of the minimum** (e.g. bottom 10% of allowed span), tint **amber/orange** — “close to minimum safety margin” without blocking if still inside envelope.

### 3.3 Density (and other params)

- Same pattern: **`slider_limits.density`** (and optionally `grid_*` if exposed) with `min` / `max` / `current`, all server-driven.

---

## 4. Apply & re-validate loop (“the engine”)

### 4.1 User flow

1. User adjusts pattern (if allowed) and/or sliders.
2. User clicks **Apply & re-validate**.
3. Frontend sends **proposed parameters** to the backend (not silent local apply).

### 4.2 Backend (LangGraph-friendly)

- A **validation / simulation** step (node or sub-graph) consumes **proposed params** + frozen **requirements/material context**.
- **Pass** (e.g. safety factor **> 1.5** — threshold is product-tunable): commit state → regenerate lattice STL → return success payload → UI updates **3D**, **Dynamo stats**, subtle **green** success on control (e.g. button state).
- **Fail** (e.g. safety factor **< 1.0**): **do not** write new STL as the active artifact; return **failure + reasons** → UI **red** flash / inline error; 3D stays on last **valid** geometry.

### 4.3 Thresholds

- Document **PASS_THRESHOLD** and **FAIL_THRESHOLD** in config (env or server config), not scattered magic numbers.

---

## 5. Critical override (“engineer’s rejection”)

When a **requirements change** (or param combo) makes the part **impossible** under the current envelope (e.g. load 500 kg at density 0.60 on octet-truss):

- Show a **banner** over the Dynamo panel, e.g.  
  **STRUCTURAL INTEGRITY COMPROMISED**  
  with copy: what failed, and **what the engine did** (e.g. “Minimum density for this load is 0.85 — sliders adjusted to nearest safe parameters”).
- Auto-clamp sliders to the **nearest feasible** set (or require explicit “Reset to safe” — product choice); spec prefers **auto-adjust + visible message** for clarity.

---

## 6. API contract — `ui_constraints` payload

The backend should expose a **single structured object** (embedded in job completion WebSocket/`done` payload and/or `GET /api/jobs/:id`) so the React app never invents physics ranges.

### 6.1 Shape (normative target)

```json
{
  "recommended_lattice": "octet-truss",
  "allowed_lattices": ["octet-truss", "gyroid", "honeycomb"],
  "disabled_lattices": [
    { "id": "strut-grid", "reason": "Surrogate screening: fails lateral shear index at 12.3 kg for current material envelope." }
  ],
  "slider_limits": {
    "strut_radius_mm": { "min": 0.8, "max": 3.0, "current": 1.8 },
    "density": { "min": 0.35, "max": 0.8, "current": 0.6 }
  },
  "validation": {
    "safety_factor": 6.13,
    "pass_threshold": 1.5,
    "fail_threshold": 1.0,
    "mode": "surrogate"
  }
}
```

### 6.2 Field notes

- Use stable **`id`** values aligned with backend generators (`strut-grid`, `octet-truss`, …).
- **`mode`:** `surrogate` | `fea` | `mixed` — drives UI copy.
- **`revalidate` response** should return the same shape (or a delta) after **Apply & re-validate**.

### 6.3 Versioning

- Include optional `ui_constraints_version: 1` for forward-compatible clients.

---

## 7. Lattice library (topology catalog)

**Source:** Not downloaded from a chemistry API — each type is **implemented** in the geometry stack (today: TypeScript + Three.js generators; target: optional Python/CAD kernel per [`ARCHITECTURE.md`](../ARCHITECTURE.md) §5.2).

### 7.1 Target families (illustrative 10)

| # | ID (example) | Family | Notes |
|---|----------------|--------|--------|
| 1 | `gyroid` | TPMS | Shipped (TS) |
| 2 | `schwarz-p` | TPMS | Target |
| 3 | `schwarz-d` | TPMS | Target |
| 4 | `neovius` | TPMS | Target |
| 5 | `lidinoid` | TPMS | Target |
| 6 | `octet-truss` | Strut | Shipped (TS) |
| 7 | `kelvin` | Strut / foam-like | Target |
| 8 | `bcc` | Strut | Target |
| 9 | `fcc` | Strut | Target |
| 10 | `voronoi` | Stochastic / bone-like | Target |
| — | `strut-grid` | Strut | Shipped (TS) |
| — | `honeycomb` | Strut / 2.5D | Shipped (TS) |

**Implementation note:** New IDs require **generator modules + eligibility hooks + PDF/STL naming** — add via a single **registry** to avoid scattering strings.

---

## 8. Parsing & orchestration (LangGraph vs “LangChain for parsing”)

- **LangGraph:** **Yes** — keep as factory orchestrator (analyze → material → lattice → validate → interrupt/resume) per [`ARCHITECTURE.md`](../ARCHITECTURE.md) §3.2.
- **Structured extraction:** Prefer **schema-validated JSON** from the LLM (Vertex/OpenAI JSON mode, function calling, etc.). In **TypeScript**, use **Zod** (or similar) to validate outputs — analogous to **Pydantic** in Python; no requirement to add Python solely for parsing.
- **LangChain prompt-template sprawl:** Avoid for **simple** structured extraction; keep the translation layer **thin, typed, testable**.

---

## 9. Shipped vs this spec (audit)

| Capability | Shipped today | This doc |
|------------|---------------|----------|
| Lattice dropdown | Fixed 4 patterns | Dynamic allow + disabled + reasons |
| Slider bounds | Fixed numeric ranges in UI/API | Server `slider_limits` |
| Re-validate | Regenerates STL + PDF always | Pass/fail gate; fail = no STL swap |
| Dynamo banner | No | Structural compromise banner |
| `ui_constraints` JSON | No | Yes |

---

## 10. Document maintenance

- When **Dynamo** behavior ships or thresholds change, update **§9** and a line in [`GRAND_PLAN.md`](../GRAND_PLAN.md).
- When **new lattice IDs** ship, update **§7** and generator registry.

*Version: 1.0 — January 2026*
