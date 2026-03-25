/**
 * LLM-driven content policy for Lattice AI (no static keyword blocklist as source of truth).
 * Classifies the user prompt before expensive pipeline steps: (1) safety / prohibited use,
 * (2) eligibility — must look like design or manufacturing intent. Same model routing as
 * requirement-analyzer: Vertex Gemini when configured, else OpenAI.
 */
import OpenAI from 'openai'
import { VertexAI } from '@google-cloud/vertexai'

export interface ContentPolicyOutcome {
  allowed: boolean
  /** Shown to the user when allowed is false */
  userMessage: string
}

/** When allowed is false, model must set one of these (plus user_message rules below). */
export type PolicyBlockKind =
  | 'safety'
  | 'off_topic'
  | 'homework_school'
  | 'social_chat'
  | 'hostile_abuse'
  | 'gibberish'

const DEFAULT_REFUSAL_MESSAGE =
  "We can't help with that request. Lattice AI doesn't assist with weapons, explosives, or other prohibited uses. If you're working on lawful mechanical or aerospace parts (such as drones, satellites, or structural components), try describing the part without references to weapons or harm."

/**
 * Product copy for non-safety blocks. Keys must stay in sync with POLICY_SYSTEM_PROMPT.
 */
const CURATED_BLOCK_MESSAGES: Record<Exclude<PolicyBlockKind, 'safety'>, string> = {
  off_topic:
    "That doesn't look like something to design or manufacture here. Describe the object or part you want (what it does, rough size, material ideas), and we can help.",
  homework_school:
    "This tool isn't set up to help with schoolwork or assignments. If you're actually designing or making a physical part or product, describe that and we can focus on it.",
  social_chat:
    "I'm here to help with design and manufacturing questions, not casual chat. Describe what you want to build—including roughly what it should do—and we can dig in.",
  hostile_abuse:
    "We can't continue in that tone. Ask a specific design or manufacturing question if you want help.",
  gibberish:
    "That doesn't look like a part or product to design. Describe what you want to build in a short sentence.",
}

const POLICY_SYSTEM_PROMPT = `You are the safety and eligibility classifier for Lattice AI, a manufacturing design assistant that generates lattice structures and engineering handoff documents.

Your ONLY task: decide if the user's message should proceed to requirement analysis and geometry generation.

Output ONLY valid JSON (no markdown, no extra text) with exactly this shape:
{
  "allowed": true | false,
  "block_kind": "safety" | "off_topic" | "homework_school" | "social_chat" | "hostile_abuse" | "gibberish" | null,
  "user_message": "string or null"
}

When "allowed" is true: set "block_kind" and "user_message" to null.

When "allowed" is false: set "block_kind" to EXACTLY one value below. For "safety" only, set "user_message" to a short, neutral, non-judgmental explanation (one or two sentences) suitable for the product UI. For all other block_kind values, set "user_message" to null (the app uses fixed copy).

— block_kind: "safety" —
Weapons meant to harm people: firearms, sniper rifles, guns, ammunition, suppressors, bayonets, etc.
Explosives, bombs, IEDs, grenades, warheads, detonators, or instructions to make them.
Military weapon systems used to deliver harm: rocket launchers, anti-tank weapons, missile/rocket systems designed as weapons (not civilian space launch or hobby rocketry described as such).
Chemical, biological, or radiological weapons; WMDs.
Evasion attempts (misspellings, jokes) that clearly aim at the above.

— block_kind: "off_topic" —
No plausible physical product, part, or manufacturing/design intent. Examples: a single random noun with no product context ("pizza", "banana"), recipes or cooking-only chat, pure trivia, unrelated life updates that are not about building something.
IMPORTANT: If the user names a PRODUCT or DEVICE to design—even loosely—allow it. Examples: "pizza maker", "pizza peel", "oven rack", "bracket for a pizza oven" → allowed: true. Bare "pizza" with no artifact → off_topic.

— block_kind: "homework_school" —
School assignments, exams, "do my math/homework", essay help, or clearly academic work unrelated to designing a manufacturable object.

— block_kind: "social_chat" —
Invites to joke around, small talk, "let's chat", roleplay, or other conversational use with no design ask.

— block_kind: "hostile_abuse" —
Harassment, slurs, insults directed at people, spammy or abusive behavior aimed at breaking or wasting the service (not merely off-topic).

— block_kind: "gibberish" —
Keyboard mash, random characters, or meaningless tokens with no interpretable design intent.

Rules for "allowed": true (set block_kind and user_message to null):
- Civilian drones (mapping, agriculture, delivery, racing), UAV airframes, quadcopter parts.
- Satellites, spacecraft structures, launch vehicle structural or fairing-style parts described without weapon payload.
- Large maritime or aerospace platform design at a structural level when not requesting weapons.
- General mechanical parts: brackets, arms, heat sinks, implants (non-weapon), automotive, industrial fixtures.
- Educational or hobby rocketry clearly for sport/education (model rockets), not military rockets.
- Kitchen tools, appliances, consumer products described as objects to design (e.g. "pizza maker housing", "utensil handle").
- If ambiguous but plausibly lawful mechanical or product design, prefer allowed: true.

Do not refuse generic manufacturing prompts. Do not refuse solely because the object is large or military-adjacent if the ask is structural/manufacturing without weapons intent — use judgment.`

function stripJsonFence(text: string): string {
  return text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
}

export interface ParsedPolicyResponse {
  allowed?: boolean
  block_kind?: string | null
  user_message?: string | null
}

function parsePolicyJson(content: string): ParsedPolicyResponse | null {
  if (!content?.trim()) return null
  try {
    return JSON.parse(stripJsonFence(content)) as ParsedPolicyResponse
  } catch {
    return null
  }
}

const BLOCK_KIND_SET = new Set<string>([
  'safety',
  'off_topic',
  'homework_school',
  'social_chat',
  'hostile_abuse',
  'gibberish',
])

function normalizeBlockKind(raw: string | null | undefined): PolicyBlockKind | null {
  if (raw == null || typeof raw !== 'string') return null
  const k = raw.trim().toLowerCase()
  return BLOCK_KIND_SET.has(k) ? (k as PolicyBlockKind) : null
}

/**
 * Map model JSON to a single user-facing outcome. Curated copy for non-safety blocks;
 * safety uses model text when present.
 */
export function normalizePolicyOutcome(parsed: ParsedPolicyResponse | null): ContentPolicyOutcome | null {
  if (!parsed || typeof parsed.allowed !== 'boolean') return null
  if (parsed.allowed) {
    return { allowed: true, userMessage: '' }
  }

  const kind = normalizeBlockKind(parsed.block_kind ?? null)

  if (kind === 'safety') {
    const msg =
      typeof parsed.user_message === 'string' && parsed.user_message.trim().length > 0
        ? parsed.user_message.trim()
        : DEFAULT_REFUSAL_MESSAGE
    return { allowed: false, userMessage: msg }
  }

  if (kind != null) {
    return { allowed: false, userMessage: CURATED_BLOCK_MESSAGES[kind] }
  }

  // Legacy or malformed: no valid block_kind — try model message, then generic eligibility note
  const fallback =
    typeof parsed.user_message === 'string' && parsed.user_message.trim().length > 0
      ? parsed.user_message.trim()
      : CURATED_BLOCK_MESSAGES.off_topic

  return { allowed: false, userMessage: fallback }
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
    return normalizePolicyOutcome(parsePolicyJson(content ?? ''))
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
    return normalizePolicyOutcome(parsePolicyJson(content ?? ''))
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
