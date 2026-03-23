import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFPage, PDFFont } from 'pdf-lib'
import { writeFileSync } from 'node:fs'
import type { AnalyzedRequirements } from '../agents/types.js'
import type { LatticeResult, LatticeParams } from './lattice-types.js'
import { getMaterialProcessProfile } from './material-profiles.js'
import { deriveLatticeDna, LATTICE_DNA_PERTURBATION_MM } from './lattice-dna.js'

const PAGE_W = 595
const PAGE_H = 842
const MARGIN = 50
const LINE_HEIGHT = 14
const TITLE_SIZE = 22
const SECTION_SIZE = 12
const BODY_SIZE = 10
const MAX_TEXT_W = PAGE_W - MARGIN * 2

const GENERATOR_VERSION = 'builder-spec-v2'

/** Standard 14 fonts only support WinAnsi; strip/replace Unicode that breaks encoding. */
function sanitizePdfText(text: string): string {
  const subDigits = '₀₁₂₃₄₅₆₇₈₉'
  let s = text
  for (let i = 0; i <= 9; i++) {
    s = s.replaceAll(subDigits[i]!, String(i))
  }
  return s
    .normalize('NFKC')
    .replace(/μ/g, 'u')
    .replace(/µ/g, 'u')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2212/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\u00b0/g, ' deg ')
    .replace(/\u00d7/g, 'x')
    .replace(/\u2026/g, '...')
}

/** PubChem-enriched snapshot when available (from material interrupt list). */
export interface BuilderSpecMaterialSnapshot {
  id: string
  name?: string
  formula?: string
  safetyStatus?: string
  safetyWarning?: string
}

export interface BuildBibleInput {
  requirements: AnalyzedRequirements | null
  prompt: string
  jobId: string
  simulation: LatticeResult | null | undefined
  latticeParams: LatticeParams | null | undefined
  selectedMaterialId: string | null | undefined
  selectedMaterialOption: BuilderSpecMaterialSnapshot | null | undefined
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function wrapLine(text: string, font: PDFFont, size: number, maxW: number): string[] {
  text = sanitizePdfText(text)
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(trial, size) <= maxW) {
      cur = trial
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

type Ctx = {
  doc: PDFDocument
  page: PDFPage
  y: number
  helvetica: PDFFont
  helveticaBold: PDFFont
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H])
  ctx.y = PAGE_H - MARGIN
}

function ensureSpace(ctx: Ctx, need: number): void {
  if (ctx.y - need < MARGIN + 30) {
    ctx.page.drawText('— continued —', {
      x: MARGIN,
      y: MARGIN,
      size: BODY_SIZE - 1,
      font: ctx.helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
    newPage(ctx)
  }
}

function drawHeading(ctx: Ctx, text: string, size: number, bold: boolean): void {
  ensureSpace(ctx, LINE_HEIGHT * 2)
  const t = sanitizePdfText(text)
  ctx.page.drawText(t, {
    x: MARGIN,
    y: ctx.y,
    size,
    font: bold ? ctx.helveticaBold : ctx.helvetica,
    color: rgb(0.08, 0.15, 0.35),
  })
  ctx.y -= size + 4
}

function drawParagraph(ctx: Ctx, text: string): void {
  const lines = wrapLine(text, ctx.helvetica, BODY_SIZE, MAX_TEXT_W)
  for (const line of lines) {
    ensureSpace(ctx, LINE_HEIGHT)
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size: BODY_SIZE,
      font: ctx.helvetica,
      color: rgb(0.15, 0.15, 0.15),
    })
    ctx.y -= LINE_HEIGHT
  }
}

function drawBullet(ctx: Ctx, text: string): void {
  const prefix = '• '
  const indent = MARGIN + 12
  const lines = wrapLine(text, ctx.helvetica, BODY_SIZE, MAX_TEXT_W - 12)
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(ctx, LINE_HEIGHT)
    const t = i === 0 ? prefix + lines[i]!.replace(/^\s+/, '') : lines[i]!
    ctx.page.drawText(i === 0 ? t : `  ${t}`, {
      x: i === 0 ? MARGIN : indent,
      y: ctx.y,
      size: BODY_SIZE,
      font: ctx.helvetica,
      color: rgb(0.15, 0.15, 0.15),
    })
    ctx.y -= LINE_HEIGHT
  }
}

function drawSurrogateStressFigure(ctx: Ctx): void {
  drawHeading(ctx, 'Figure 3.1 — Surrogate stress map (illustrative)', SECTION_SIZE, true)
  drawParagraph(
    ctx,
    'This heatmap is a topology-class surrogate, not output from a finite-element solver. Redder cells represent regions where a detailed FEA mesh would likely show higher stress concentration for comparable loading and boundary conditions.'
  )
  ctx.y -= 8
  const rows = 6
  const cols = 10
  const cellW = 4.2
  const cellH = 14
  const originX = MARGIN
  const originY = ctx.y - rows * cellH
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = (c + r * 0.35) / (cols + rows * 0.35)
      const red = Math.min(1, 0.35 + t * 0.65)
      const blue = Math.min(1, 0.5 + (1 - t) * 0.45)
      const green = 0.25 + (1 - Math.abs(t - 0.5) * 2) * 0.2
      ctx.page.drawRectangle({
        x: originX + c * cellW,
        y: originY + r * cellH,
        width: cellW - 0.4,
        height: cellH - 0.4,
        color: rgb(red, green, blue),
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.2,
      })
    }
  }
  ctx.y = originY - 24
  drawParagraph(
    ctx,
    'Replace this figure with solver-backed contours (e.g. von Mises) before using the part under regulated structural sign-off.'
  )
}

function drawOrientationDiagram(ctx: Ctx): void {
  drawHeading(ctx, 'Figure B.1 — Build orientation (schematic)', SECTION_SIZE, true)
  const cx = PAGE_W / 2
  const baseY = ctx.y - 100
  ctx.page.drawRectangle({
    x: cx - 120,
    y: baseY,
    width: 240,
    height: 8,
    color: rgb(0.75, 0.75, 0.78),
    borderColor: rgb(0.3, 0.3, 0.35),
    borderWidth: 0.5,
  })
  ctx.page.drawText('Build plate', {
    x: cx - 28,
    y: baseY + 10,
    size: 8,
    font: ctx.helvetica,
    color: rgb(0.2, 0.2, 0.2),
  })
  ctx.page.drawRectangle({
    x: cx - 45,
    y: baseY + 28,
    width: 90,
    height: 70,
    color: rgb(0.85, 0.9, 0.95),
    borderColor: rgb(0.15, 0.25, 0.45),
    borderWidth: 1,
  })
  ctx.page.drawText('Part Z (build)', {
    x: cx - 32,
    y: baseY + 55,
    size: 9,
    font: ctx.helveticaBold,
    color: rgb(0.1, 0.2, 0.4),
  })
  ctx.page.drawLine({
    start: { x: cx + 55, y: baseY + 55 },
    end: { x: cx + 85, y: baseY + 85 },
    thickness: 1.5,
    color: rgb(0.1, 0.5, 0.8),
  })
  ctx.page.drawText('Z', {
    x: cx + 88,
    y: baseY + 86,
    size: 11,
    font: ctx.helveticaBold,
    color: rgb(0.1, 0.5, 0.8),
  })
  ctx.y = baseY - 28
  drawParagraph(
    ctx,
      'Pitch / roll / yaw: default 0° / 0° / 0° in machine coordinates unless your CAM package uses another convention. Align primary structural axis with Z when consistent with Section 4.0 orientation note.'
  )
}

/**
 * Generate Builder Spec PDF per docs/BUILDER_SPEC_REQUIREMENTS.md (Sections 1.0–6.0 + appendices).
 * Returns SHA-256 of canonical payload (excluding the hash field) for Section 1.0.
 */
export async function generateBuildBible(
  outputPath: string,
  input: BuildBibleInput
): Promise<{ path: string; documentSha256: string } | null> {
  try {
    const {
      requirements,
      prompt,
      jobId,
      simulation,
      latticeParams,
      selectedMaterialId,
      selectedMaterialOption,
    } = input

    const materialId = selectedMaterialId ?? selectedMaterialOption?.id ?? 'unknown'
    const profile = getMaterialProcessProfile(materialId)
    const params = latticeParams
    const dna =
      params && simulation
        ? deriveLatticeDna({
            jobId,
            pattern: params.pattern,
            gridX: params.gridX,
            gridY: params.gridY,
            gridZ: params.gridZ,
            strutRadiusMm: params.strutRadius,
          })
        : []

    const generatedAtIso = new Date().toISOString()

    const canonicalPayload = {
      generatorVersion: GENERATOR_VERSION,
      jobId,
      generatedAtIso,
      prompt,
      requirements,
      simulation,
      latticeParams: params,
      selectedMaterialId: materialId,
      materialProfile: {
        alloySpecification: profile.alloySpecification,
        powderMorphology: profile.powderMorphology,
        toxicityAndSafety: profile.toxicityAndSafety,
      },
      latticeDna: dna.map((w) => ({
        id: w.canonicalId,
        deltaMm: w.thicknessDeltaMm,
      })),
      pubChemSnapshot: selectedMaterialOption
        ? {
            safetyStatus: selectedMaterialOption.safetyStatus,
            safetyWarning: selectedMaterialOption.safetyWarning,
          }
        : null,
    }

    const documentSha256 = createHash('sha256').update(stableStringify(canonicalPayload)).digest('hex')

    const doc = await PDFDocument.create()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

    const ctx: Ctx = {
      doc,
      page: doc.addPage([PAGE_W, PAGE_H]),
      y: PAGE_H - MARGIN,
      helvetica,
      helveticaBold,
    }

    // ——— Title ———
    drawHeading(ctx, 'Lattice AI — Builder Spec', TITLE_SIZE, true)
    drawParagraph(ctx, `Document version ${GENERATOR_VERSION} — engineering handoff package`)
    drawParagraph(ctx, `Generated (UTC): ${generatedAtIso}`)
    drawParagraph(ctx, `Job ID: ${jobId}`)
    ctx.y -= 6

    // ——— Section 1.0 Genesis Identity ———
    drawHeading(ctx, '1.0 Genesis identity (IP lock)', SECTION_SIZE + 1, true)
    drawParagraph(ctx, `Document hash (SHA-256, canonical payload): ${documentSha256}`)
    drawParagraph(
      ctx,
      'RFC-3161 legal timestamp: not yet bound to a Time-Stamp Authority (TSA). This document includes an ISO-8601 generation timestamp only. For patent-office–style proof, integrate a qualified TSA per your legal counsel.'
    )
    drawParagraph(
      ctx,
      `LATTICE-DNA™ physical watermark: five internal struts carry a deterministic thickness perturbation of ±${LATTICE_DNA_PERTURBATION_MM} mm relative to nominal strut radius. Verification: CT-scan or destructive section at the locations below; compare measured fused strut diameter to nominal ${params?.strutRadius ?? '—'} mm ± ${LATTICE_DNA_PERTURBATION_MM} mm. Watermark applies to job ${jobId} only.`
    )
    if (dna.length) {
      dna.forEach((w, i) => {
        drawBullet(
          ctx,
          `Watermark ${i + 1}: ID ${w.canonicalId}; ${w.locationDescription} Delta: ${w.thicknessDeltaMm >= 0 ? '+' : ''}${w.thicknessDeltaMm} mm on radius.`
        )
      })
    } else {
      drawParagraph(ctx, 'Lattice parameters unavailable — re-export Builder Spec after a successful generation run for full LATTICE-DNA table.')
    }
    ctx.y -= 4

    // ——— Section 2.0 Material ———
    drawHeading(ctx, '2.0 Material metadata (chemistry & procurement)', SECTION_SIZE + 1, true)
    drawParagraph(ctx, `Selected material ID: ${materialId}`)
    if (selectedMaterialOption?.name) drawParagraph(ctx, `Catalog name: ${selectedMaterialOption.name}`)
    if (selectedMaterialOption?.formula) drawParagraph(ctx, `Formula / label: ${selectedMaterialOption.formula}`)
    drawParagraph(ctx, `Alloy / grade: ${profile.alloySpecification}`)
    drawParagraph(ctx, `Powder / feedstock morphology: ${profile.powderMorphology}`)
    const safetyBlock = [
      profile.toxicityAndSafety,
      selectedMaterialOption?.safetyStatus
        ? `PubChem-aligned status string: ${selectedMaterialOption.safetyStatus}`
        : null,
      selectedMaterialOption?.safetyWarning
        ? `Hazard flag: ${selectedMaterialOption.safetyWarning}`
        : null,
    ]
      .filter(Boolean)
      .join(' ')
    drawParagraph(ctx, `Toxicity & safety: ${safetyBlock}`)
    ctx.y -= 4

    // ——— Section 3.0 Kinematic ———
    drawHeading(ctx, '3.0 Kinematic profile (structural proof)', SECTION_SIZE + 1, true)
    if (simulation && params) {
      drawParagraph(
        ctx,
        `Unit cell topology: ${simulation.pattern}. Surrogate relative density (solid volume / bounding box): ${simulation.relativeDensityPercent}%. Bounding box (mm): ${Math.round(params.width)} × ${Math.round(params.height)} × ${Math.round(params.depth)}.`
      )
      drawParagraph(
        ctx,
        `Load narrative: estimated structural capacity index ${simulation.estimatedLoadKg} kg (surrogate), mass estimate ${simulation.estimatedMassG} g, safety factor vs nominal target load ${simulation.safetyFactor}.`
      )
      drawParagraph(ctx, `Indicative yield band (surrogate, not FEA): ~${simulation.indicativeYieldMpa} MPa — ${simulation.structuralProofNote}`)
    } else {
      drawParagraph(ctx, 'Simulation snapshot unavailable.')
    }
    ctx.y -= 4

    drawSurrogateStressFigure(ctx)
    ctx.y -= 8

    // ——— Section 4.0 Thermal ———
    drawHeading(ctx, '4.0 Thermal dictate (process parameters)', SECTION_SIZE + 1, true)
    if (profile.primaryModality === 'polymer_fdm') {
      const t = profile.thermalDictate.extrusionTempC
      drawParagraph(
        ctx,
        `Layer thickness: ${profile.thermalDictate.layerMicrons} µm (FDM layer height). Nozzle temperature: ${t ? `${t.min}–${t.max} °C` : 'per vendor TDS'}. Bed: ${profile.thermalDictate.bedTempC ?? 'per vendor'} °C.`
      )
      drawParagraph(ctx, `Orientation: ${profile.thermalDictate.orientationNote}`)
    } else if (profile.primaryModality === 'polymer_sls') {
      drawParagraph(
        ctx,
        `Layer thickness: ${profile.thermalDictate.layerMicrons} µm (SLS slice). Chamber / bed thermal profile: per OEM qualified recipe.`
      )
      drawParagraph(ctx, `Orientation: ${profile.thermalDictate.orientationNote}`)
    } else {
      drawParagraph(
        ctx,
        `Layer thickness: ${profile.thermalDictate.layerMicrons} µm. Laser power: ${profile.thermalDictate.laserPowerW ?? '—'} W. Scan speed: ${profile.thermalDictate.scanSpeedMmS ?? '—'} mm/s. Hatch spacing: ${profile.thermalDictate.hatchSpacingMm ?? '—'} mm.`
      )
      drawParagraph(ctx, `Print orientation: ${profile.thermalDictate.orientationNote}`)
    }
    drawParagraph(
      ctx,
      'These values are starting-point literature/OEM-style defaults — you must substitute values from your qualified parameter development (PdM) for production.'
    )
    ctx.y -= 4

    // ——— Section 5.0 Metallurgical ———
    drawHeading(ctx, '5.0 Metallurgical cure (post-processing)', SECTION_SIZE + 1, true)
    drawParagraph(ctx, `Stress relief / HIP: ${profile.metallurgical.stressRelief}`)
    drawParagraph(ctx, `Support removal & handling: ${profile.metallurgical.supportRemoval}`)
    drawParagraph(ctx, `Surface finish: ${profile.metallurgical.surfaceFinish}`)
    ctx.y -= 4

    // ——— Section 6.0 QA ———
    drawHeading(ctx, '6.0 Quality assurance', SECTION_SIZE + 1, true)
    const massTarget = simulation?.estimatedMassG
    drawParagraph(
      ctx,
      massTarget != null
        ? `Target mass: final part shall weigh ${massTarget} g ${profile.qa.massToleranceG}. Under-mass may indicate missing struts, incomplete fusion, or powder loss.`
        : `Target mass: derive from weighed coupon or scaled STL volume × tapped density; ${profile.qa.massToleranceG}.`
    )
    drawParagraph(ctx, `Dimensional tolerance: ${profile.qa.dimensionalToleranceMm}`)
    ctx.y -= 8

    // ——— Appendix A ———
    drawHeading(ctx, 'Appendix A — Items required (BOM)', SECTION_SIZE + 1, true)
    drawBullet(ctx, `Primary material: ${profile.bom.primaryMaterial}`)
    drawBullet(ctx, `Substrate (build plate): ${profile.bom.substrate}`)
    drawBullet(ctx, `Atmosphere / environment: ${profile.bom.atmosphere}`)
    drawBullet(ctx, `Consumables: ${profile.bom.consumables}`)
    drawBullet(ctx, `Safety (PPE): ${profile.bom.ppe}`)
    ctx.y -= 8

    // ——— Appendix B ———
    drawHeading(ctx, 'Appendix B — Building spec (machine linkage)', SECTION_SIZE + 1, true)
    drawParagraph(ctx, 'Geometry file: lattice.stl (included in download package; same job as this PDF).')
    drawParagraph(
      ctx,
      'Support structures: generate supports per OEM for overhangs above qualified angle; prefer tree supports for lattices where applicable. Remove per Section 5.0.'
    )
    drawParagraph(
      ctx,
      `Laser / extruder block summary: repeat Section 4.0 numbers in your slicer / LPBF job file; link hatch, laser power, and scan speed as a single qualified parameter set.`
    )
    drawOrientationDiagram(ctx)
    ctx.y -= 8

    // ——— Appendix C ———
    drawHeading(ctx, 'Appendix C — Chronological workflow', SECTION_SIZE + 1, true)
    drawBullet(
      ctx,
      'Phase 1 — Pre-process: verify powder moisture / filament dryness; level bed; purge chamber; O₂ or moisture per OEM if metal LPBF.'
    )
    drawBullet(ctx, 'Phase 2 — Active build: run job file; monitor layer-wise sensors; do not open chamber mid-build.')
    drawBullet(
      ctx,
      'Phase 3 — Cool-down & extraction: controlled cool per recipe; avoid thermal shock; depowder carefully to protect thin struts.'
    )
    drawBullet(
      ctx,
      'Phase 4 — Metallurgical cure: stress relief / HIP per Section 5.0; cut-off from plate (EDM preferred for metals); finish and inspect to Section 6.0.'
    )
    ctx.y -= 8

    // ——— Requirements echo ———
    drawHeading(ctx, 'Design intent (from prompt)', SECTION_SIZE + 1, true)
    drawParagraph(ctx, prompt.length > 600 ? `${prompt.slice(0, 600)}…` : prompt)
    if (requirements) {
      if (requirements.summary) drawParagraph(ctx, `Summary: ${requirements.summary}`)
      if (requirements.materials?.length) {
        drawParagraph(ctx, `Material hints: ${requirements.materials.join(', ')}`)
      }
      if (requirements.weightConstraint) drawParagraph(ctx, `Weight: ${requirements.weightConstraint}`)
      if (requirements.loadConstraint) drawParagraph(ctx, `Load: ${requirements.loadConstraint}`)
      if (requirements.process) drawParagraph(ctx, `Process: ${requirements.process}`)
      if (requirements.constraints?.length) {
        drawParagraph(ctx, `Constraints: ${requirements.constraints.join('; ')}`)
      }
    }

    const pdfBytes = await doc.save()
    writeFileSync(outputPath, pdfBytes)
    return { path: outputPath, documentSha256 }
  } catch (err) {
    console.error('[BuildBible]', err)
    return null
  }
}
