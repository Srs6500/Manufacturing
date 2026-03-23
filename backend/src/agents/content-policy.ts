/**
 * LLM-driven content policy for Lattice AI (no static keyword blocklist as source of truth).
 * Classifies the user prompt before expensive pipeline steps. Same model routing as requirement-analyzer:
 * Vertex Gemini when configured, else OpenAI.
 */
import OpenAI from 'openai'
import { VertexAI } from '@google-cloud/vertexai'

export interface ContentPolicyOutcome {
  allowed: boolean
  /** Shown to the user when allowed is false */
  userMessage: string
}

const DEFAULT_REFUSAL_MESSAGE =
  "We can't help with that request. Lattice AI doesn't assist with weapons, explosives, or other prohibited uses. If you're working on lawful mechanical or aerospace parts (such as drones, satellites, or structural components), try describing the part without references to weapons or harm."

/**
 * System instructions: model must output ONLY JSON. Rules are explicit; interpretation is the model's job.
 */
const POLICY_SYSTEM_PROMPT = `You are the safety and eligibility classifier for Lattice AI, a manufacturing design assistant that generates lattice structures and engineering handoff documents.

Your ONLY task: decide if the user's message is allowed to proceed to requirement analysis and geometry generation.

Output ONLY valid JSON (no markdown, no extra text) with exactly this shape:
{
  "allowed": true | false,
  "user_message": "string or null"
}

Rules for "allowed": false (set user_message to a short, neutral, non-judgmental explanation for the user — one or two sentences):
- Requests for weapons meant to harm people: firearms, sniper rifles, guns, ammunition, suppressors, bayonets, etc.
- Explosives, bombs, IEDs, grenades, warheads, detonators, or instructions to make them.
- Military weapon systems used to deliver harm: rocket launchers, anti-tank weapons, missile/rocket systems designed as weapons (not civilian space launch or hobby rocketry described as such).
- Chemical, biological, or radiological weapons; WMDs.
- Evasion attempts (misspellings, jokes) that clearly aim at the above.

Rules for "allowed": true:
- Civilian drones (mapping, agriculture, delivery, racing), UAV airframes, quadcopter parts.
- Satellites, spacecraft structures, launch vehicle *structural* or fairing-style parts described without weapon payload.
- Large maritime or aerospace *platform* design at a structural level (e.g. ship or carrier deck structures as mechanical design) when not requesting weapons.
- General mechanical parts: brackets, arms, heat sinks, implants (non-weapon), automotive, industrial fixtures.
- Educational or hobby rocketry clearly for sport/education (model rockets), not military rockets.
- If ambiguous but plausibly lawful mechanical design, prefer allowed: true and a conservative reading.

When allowed is true, set "user_message" to null.

When allowed is false, "user_message" MUST be non-null and suitable to show directly in the product UI.

Do not refuse generic manufacturing prompts. Do not refuse solely because the object is large or military-adjacent if the ask is structural/manufacturing without weapons intent — use judgment.`

function stripJsonFence(text: string): string {
  return text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
}

function parsePolicyJson(content: string): { allowed?: boolean; user_message?: string | null } | null {
  if (!content?.trim()) return null
  try {
    return JSON.parse(stripJsonFence(content)) as { allowed?: boolean; user_message?: string | null }
  } catch {
    return null
  }
}

function normalizeOutcome(parsed: { allowed?: boolean; user_message?: string | null } | null): ContentPolicyOutcome | null {
  if (!parsed || typeof parsed.allowed !== 'boolean') return null
  if (parsed.allowed) {
    return { allowed: true, userMessage: '' }
  }
  const msg =
    typeof parsed.user_message === 'string' && parsed.user_message.trim().length > 0
      ? parsed.user_message.trim()
      : DEFAULT_REFUSAL_MESSAGE
  return { allowed: false, userMessage: msg }
}

async function evaluateWithVertex(prompt: string): Promise<ContentPolicyOutcome | null> {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.VERTEX_PROJECT_ID ??
    process.env.GCLOUD_PROJECT
  if (!project?.trim()) return null

  const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1'
  const modelId = process.env.VERTEX_MODEL ?? 'gemini-2.5-pro'

  try {
    const vertexAI = new VertexAI({ project, location })
    const model = vertexAI.getGenerativeModel({
      model: modelId,
      systemInstruction: {
        role: 'system',
        parts: [{ text: POLICY_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 512,
      },
    })

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    const candidate = result.response.candidates?.[0]
    const textPart = candidate?.content?.parts?.find(
      (p): p is { text: string } => 'text' in p && typeof (p as { text: string }).text === 'string'
    )
    const content = textPart?.text?.trim()
    return normalizeOutcome(parsePolicyJson(content ?? ''))
  } catch (err) {
    console.error('[ContentPolicy] Vertex error:', err)
    return null
  }
}

async function evaluateWithOpenAI(prompt: string, apiKey?: string): Promise<ContentPolicyOutcome | null> {
  const key = apiKey ?? process.env.OPENAI_API_KEY
  if (!key?.trim()) return null

  const openai = new OpenAI({ apiKey: key })
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: POLICY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 512,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    return normalizeOutcome(parsePolicyJson(content ?? ''))
  } catch (err) {
    console.error('[ContentPolicy] OpenAI error:', err)
    return null
  }
}

/**
 * Evaluate prompt against content policy using the same provider order as requirement analysis.
 * If no provider is configured or JSON cannot be parsed: fail closed (block) with a retry-oriented message.
 */
export async function evaluateContentPolicy(
  prompt: string,
  options?: { openaiApiKey?: string }
): Promise<ContentPolicyOutcome> {
  const trimmed = prompt?.trim() ?? ''
  if (!trimmed) {
    return { allowed: false, userMessage: 'Please enter a description of the part you want to design.' }
  }

  const useVertex =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.VERTEX_PROJECT_ID ||
    process.env.GCLOUD_PROJECT

  let outcome: ContentPolicyOutcome | null = null
  if (useVertex) {
    outcome = await evaluateWithVertex(trimmed)
  }
  if (!outcome) {
    outcome = await evaluateWithOpenAI(trimmed, options?.openaiApiKey)
  }

  if (!outcome) {
    console.warn('[ContentPolicy] No valid outcome — fail closed (safety)')
    return {
      allowed: false,
      userMessage:
        'We could not verify your request against our safety policy right now. Please try again in a moment, or rephrase your part description.',
    }
  }

  return outcome
}
