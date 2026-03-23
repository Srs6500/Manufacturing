# Builder Spec — Product Requirements

**Purpose:** Define what the exported **Builder Spec** document must eventually contain. This file is a **requirements reference** for PDF/spec content only. It does **not** replace or override [`GRAND_PLAN.md`](../GRAND_PLAN.md) or [`ARCHITECTURE.md`](../ARCHITECTURE.md).

**Status:** Target specification — implementation may be phased.

---

## Section 1.0 — Genesis Identity (The IP Lock)

This section replaces the need for heavy blockchain transactions. It proves **who** made the artifact and **when**, locking IP.

| Element | Requirement |
|--------|----------------|
| **Document Hash (SHA-256)** | A unique cryptographic string derived from the document text (or canonical representation). |
| **RFC-3161 Legal Timestamp** | A legally recognized timestamp (patent-office–adjacent standard) proving **when** the document was generated. |
| **LATTICE-DNA™ (physical watermark)** | **What:** The system secretly adjusts thickness of **5 specific internal struts** deep in the lattice (e.g. **±0.01 mm** deltas). **Why:** Creates a physical “binary barcode” inside the part — a competitor who CT-scans a stolen physical part copies the user’s watermark. **Build Spec obligation:** The Builder Spec must state **exactly where** to look for this watermark (locations / strut IDs / measurement guidance). |

---

## Section 2.0 — Material Metadata (The Chemistry)

Go beyond “use titanium” — specify **molecular / procurement-grade** detail so the part is not under-specified.

| Element | Requirement |
|--------|----------------|
| **Alloy specification** | e.g. Ti-6Al-4V Grade 23 (ELI), with grade/eligibility called out explicitly. |
| **Powder morphology** | Particle size distribution (e.g. 15–45 µm), shape (e.g. spherical), and any supplier-relevant notes. |
| **Toxicity / safety** | Warnings sourced from authoritative chemistry data (e.g. **PubChem** integration) — e.g. titanium dust explosivity, mandatory argon/inert atmosphere, PPE. |

---

## Section 3.0 — Kinematic Profile (The Physics Proof)

Demonstrate the part is a **validated mechanical component**, not a decorative mesh.

| Element | Requirement |
|--------|----------------|
| **Unit cell topology** | e.g. Gyroid, **relative density** (e.g. 35%). |
| **Load rating (yield / failure)** | e.g. “Failure begins at 850 MPa” (or equivalent validated metric tied to simulation/material model). |
| **FEA stress visualization** | A **visual** (heatmap / render) showing stress concentration regions — not numbers alone. |

---

## Section 4.0 — Thermal Dictate (Print “Secret Sauce”)

STL alone is insufficient; wrong thermal guesses → cracked prints. This section is **high-value, process-specific**.

| Element | Requirement |
|--------|----------------|
| **Layer thickness** | e.g. 30 µm. |
| **Laser power** | e.g. 250 W. |
| **Scan speed** | e.g. 1200 mm/s. |
| **Hatch spacing** | e.g. 0.1 mm. |
| **Print orientation** | Explicit guidance (e.g. angle to build plate to mitigate Z-axis shear / tearing). |

---

## Section 5.0 — Metallurgical Cure (Post-Processing)

Printed lattices retain **trapped stress**; skipping post-process risks fracture.

| Element | Requirement |
|--------|----------------|
| **Stress relief protocol** | e.g. vacuum furnace cycle, temperature, duration, atmosphere, quench method. |
| **Support removal** | Where to cut, what to avoid, part/plate handling. |
| **Surface finish** | Sandblast, chemical polish, or other specified finish requirements. |

---

## Section 6.0 — Quality Assurance (The Validation)

How the operator **proves** the recipe was followed.

| Element | Requirement |
|--------|----------------|
| **Target mass** | e.g. “Final part must weigh 42.4 g (±0.5 g)” with interpretation (e.g. under-mass → voids / failed print). |
| **Dimensional tolerance** | e.g. ±0.1 mm on critical features (mounting holes, interfaces). |

---

## Appendix A — Items Required (BOM)

Expands Section 2.0 into a **pre-flight checklist** of everything in the room before “Start.”

- **Primary material** — e.g. mass of specified alloy powder with particle size.
- **Substrate (build plate)** — material and warnings (e.g. no aluminum if it welds/tears).
- **Atmosphere (gas)** — e.g. high-purity argon; purpose (explosion/oxidation prevention).
- **Consumables** — e.g. ceramic recoater blade.
- **Safety (PPE)** — respirator, gloves, anti-static, etc., aligned with Section 2.0 safety data.

---

## Appendix B — Building Spec (Machine Code)

Maps to **Section 4.0** — direct translation from CAD/job artifact to **printer parameters**.

- **Geometry file** — canonical filename / version (e.g. `lattice_v4_final.stl`).
- **Z-axis orientation** — pitch / roll / yaw (or equivalent) with **visual diagram** of placement on the build plate.
- **Support structures** — type and rules (e.g. tree supports only above N° overhang).
- **Laser / extruder block** — power, velocity, layer height, and any linked parameters from Section 4.0.

---

## Appendix C — The Process (Chronological Workflow)

Maps to **Section 5.0** — **time-phased** operator narrative.

**Example structure (illustrative):**

1. **Phase 1 — Pre-process** — Chamber atmosphere (e.g. O₂ &lt; 0.1%), plate preheat, checks.
2. **Phase 2 — Active build** — Chamber closed; execute Building Spec.
3. **Phase 3 — Cool-down & extraction** — Controlled atmosphere cool; warnings on early air exposure.
4. **Phase 4 — Metallurgical cure** — Furnace cycle, cut-off method (e.g. wire EDM), handoff to QA.

---

## Notes for Implementation (Non-binding)

- **Data sources:** PubChem (or equivalent) for chemistry/safety; simulation pipeline for FEA visuals and load numbers; job metadata for geometry hash and timestamps.
- **RFC-3161:** Requires integration with a **TSA (Time-Stamp Authority)** — product/legal decision, not a LangGraph default.
- **LATTICE-DNA™:** Requires deterministic or auditable rules for **which** struts and **how** thickness is perturbed, plus export of **lookup instructions** in the spec.

---

*Document version: 1.0 — requirements only; implementation tracked separately from GRAND_PLAN.*
