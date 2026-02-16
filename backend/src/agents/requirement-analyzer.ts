import OpenAI from 'openai'
import { VertexAI } from '@google-cloud/vertexai'
import type { AnalyzedRequirements } from './types.js'

const SYSTEM_PROMPT = `You are a Requirement Analyzer for a manufacturing AI. Given a natural-language prompt describing a part, extract structured requirements as JSON.

Output ONLY valid JSON with this shape (no markdown, no explanation):
{
  "materials": ["list", "of", "material", "hints"],
  "weightConstraint": "e.g. under 200g or null",
  "loadConstraint": "e.g. survive 10G crash or null",
  "process": "e.g. SLM printable or null",
  "constraints": ["other", "constraints", "e.g. recyclable"],
  "summary": "one-line summary"
}

If a field is not mentioned, use null for strings or empty array for arrays. Keep materials and constraints concise.`

function normalizeParsed(parsed: AnalyzedRequirements): AnalyzedRequirements {
  if (!Array.isArray(parsed.materials)) parsed.materials = []
  if (!Array.isArray(parsed.constraints)) parsed.constraints = []
  if (typeof parsed.summary !== 'string') parsed.summary = ''
  if (parsed.weightConstraint === undefined) parsed.weightConstraint = undefined
  if (parsed.loadConstraint === undefined) parsed.loadConstraint = undefined
  if (parsed.process === undefined) parsed.process = undefined
  return parsed
}

function parseContentToRequirements(content: string): AnalyzedRequirements | null {
  if (!content?.trim()) return null
  const raw = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  try {
    const parsed = JSON.parse(raw) as AnalyzedRequirements
    return normalizeParsed(parsed)
  } catch {
    return null
  }
}

/**
 * Requirement Analyzer using Vertex AI Gemini.
 * Uses GOOGLE_CLOUD_PROJECT (or VERTEX_PROJECT_ID), GOOGLE_CLOUD_LOCATION, VERTEX_MODEL.
 */
async function analyzeWithVertex(prompt: string): Promise<AnalyzedRequirements | null> {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.VERTEX_PROJECT_ID ??
    process.env.GCLOUD_PROJECT
  if (!project?.trim()) {
    console.warn('[RequirementAnalyzer] Vertex: no project ID (GOOGLE_CLOUD_PROJECT / VERTEX_PROJECT_ID)')
    return null
  }

  const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
  const modelId = process.env.VERTEX_MODEL ?? 'gemini-2.5-pro'

  try {
    const vertexAI = new VertexAI({ project, location })
    const model = vertexAI.getGenerativeModel({
      model: modelId,
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    const response = result.response
    const candidate = response.candidates?.[0]
    const textPart = candidate?.content?.parts?.find(
      (p): p is { text: string } => 'text' in p && typeof (p as { text: string }).text === 'string'
    )
    const content = textPart?.text?.trim()
    if (!content) return null

    return parseContentToRequirements(content)
  } catch (err) {
    console.error('[RequirementAnalyzer] Vertex error:', err)
    return null
  }
}

/**
 * Requirement Analyzer using OpenAI.
 * Uses OPENAI_API_KEY, OPENAI_MODEL.
 */
async function analyzeWithOpenAI(
  prompt: string,
  apiKey?: string
): Promise<AnalyzedRequirements | null> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  if (!key?.trim()) {
    console.warn('[RequirementAnalyzer] OpenAI: OPENAI_API_KEY not set')
    return null
  }

  const openai = new OpenAI({ apiKey: key })
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) return null
    return parseContentToRequirements(content)
  } catch (err) {
    console.error('[RequirementAnalyzer] OpenAI error:', err)
    return null
  }
}

/**
 * Runs the Requirement Analyzer: tries Vertex AI (Gemini) first if configured,
 * then OpenAI. Returns structured requirements or null if neither is configured or both fail.
 */
export async function analyzeRequirements(
  prompt: string,
  options?: { openaiApiKey?: string }
): Promise<AnalyzedRequirements | null> {
  const useVertex =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.VERTEX_PROJECT_ID ||
    process.env.GCLOUD_PROJECT

  if (useVertex) {
    const result = await analyzeWithVertex(prompt)
    if (result) return result
  }

  const result = await analyzeWithOpenAI(prompt, options?.openaiApiKey)
  return result ?? null
}
