import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync } from 'node:fs'
import type { AnalyzedRequirements } from '../agents/types.js'
import type { LatticeResult } from './lattice-types.js'

const MARGIN = 50
const LINE_HEIGHT = 18
const TITLE_SIZE = 24
const SECTION_SIZE = 14
const BODY_SIZE = 11

/**
 * Generate a Build Bible PDF from analyzed requirements and lattice simulation.
 * Saves to the given path and returns it on success, null on failure.
 */
export async function generateBuildBible(
  outputPath: string,
  requirements: AnalyzedRequirements | null,
  prompt?: string,
  jobId?: string,
  simulation?: LatticeResult
): Promise<string | null> {
  try {
    const doc = await PDFDocument.create()
    const helvetica = await doc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

    let page = doc.addPage([595, 842])
    let y = page.getSize().height - MARGIN

    const drawTitle = (text: string) => {
      page.drawText(text, {
        x: MARGIN,
        y,
        size: TITLE_SIZE,
        font: helveticaBold,
        color: rgb(0.1, 0.2, 0.4),
      })
      y -= LINE_HEIGHT * 1.5
    }

    const drawSection = (title: string) => {
      page.drawText(title, {
        x: MARGIN,
        y,
        size: SECTION_SIZE,
        font: helveticaBold,
        color: rgb(0.2, 0.3, 0.5),
      })
      y -= LINE_HEIGHT
    }

    const drawLine = (text: string) => {
      if (y < MARGIN + 40) {
        page.drawText('— continued —', {
          x: MARGIN,
          y: MARGIN,
          size: BODY_SIZE - 1,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        })
        page = doc.addPage([595, 842])
        y = page.getSize().height - MARGIN
      }
      page.drawText(text, {
        x: MARGIN + 10,
        y,
        size: BODY_SIZE,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      })
      y -= LINE_HEIGHT
    }

    drawTitle('Build Bible')
    drawLine(`Generated: ${new Date().toISOString()}`)
    if (jobId) drawLine(`Job ID: ${jobId}`)
    y -= LINE_HEIGHT * 0.5

    if (prompt) {
      drawSection('Original Prompt')
      drawLine(prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt)
      y -= LINE_HEIGHT * 0.5
    }

    if (requirements) {
      drawSection('Summary')
      drawLine(requirements.summary || 'No summary available.')
      y -= LINE_HEIGHT * 0.5

      if (requirements.materials?.length) {
        drawSection('Materials')
        requirements.materials.forEach((m) => drawLine(`• ${m}`))
        y -= LINE_HEIGHT * 0.5
      }

      if (requirements.weightConstraint) {
        drawSection('Weight Constraint')
        drawLine(requirements.weightConstraint)
        y -= LINE_HEIGHT * 0.5
      }

      if (requirements.loadConstraint) {
        drawSection('Load / Strength')
        drawLine(requirements.loadConstraint)
        y -= LINE_HEIGHT * 0.5
      }

      if (requirements.process) {
        drawSection('Manufacturing Process')
        drawLine(requirements.process)
        y -= LINE_HEIGHT * 0.5
      }

      if (requirements.constraints?.length) {
        drawSection('Other Constraints')
        requirements.constraints.forEach((c) => drawLine(`• ${c}`))
      }
    } else {
      drawSection('Requirements')
      drawLine('No requirements were extracted from the prompt.')
    }

    if (simulation) {
      y -= LINE_HEIGHT * 0.5
      drawSection('Lattice Validation')
      drawLine(`Pattern: ${simulation.pattern}`)
      drawLine(`Estimated mass: ${simulation.estimatedMassG} g`)
      drawLine(`Estimated load capacity: ${simulation.estimatedLoadKg} kg`)
      drawLine(`Safety factor: ${simulation.safetyFactor}`)
      y -= LINE_HEIGHT * 0.5
    }

    drawSection('Print Settings (Recommended)')
    drawLine('Nozzle temp: 260–280°C (material-dependent)')
    drawLine('Layer height: 0.2 mm')
    drawLine('Wall thickness: 1.2 mm (3 walls)')
    drawLine('Infill: Use lattice structure from STL')
    drawLine('Post-processing: Anneal if required by material')
    y -= LINE_HEIGHT * 0.5

    const pdfBytes = await doc.save()
    writeFileSync(outputPath, pdfBytes)
    return outputPath
  } catch (err) {
    console.error('[BuildBible]', err)
    return null
  }
}
