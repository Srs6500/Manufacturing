# Content policy (weapons & prohibited use)

> **Purpose:** Describe how Lattice AI blocks **weapons, explosives, and similar prohibited requests** before the main generation pipeline runs. Implementation is **LLM-driven** (Vertex Gemini / OpenAI), not a static keyword blocklist as the source of truth.

**Code:** [`backend/src/agents/content-policy.ts`](../backend/src/agents/content-policy.ts) · **Graph:** `policy_gate` node in [`backend/src/graph/pipeline.ts`](../backend/src/graph/pipeline.ts).

---

## What is blocked (model instructions)

The system prompt directs the model to set `allowed: false` for requests involving:

- Firearms and lethal weapons (e.g. sniper rifles, guns, ammunition) when aimed at harm.
- Explosives, bombs, IEDs, grenades, warheads, detonators.
- Weapon-delivery systems such as **rocket launchers** and **missiles as weapons** (distinct from civilian space launch or hobby rocketry described lawfully).
- CBRN / WMDs.
- Clear evasion attempts targeting the above.

## What remains allowed (examples)

- Civilian **drones**, UAV structures, mapping/delivery use cases.
- **Satellites**, spacecraft structures, fairings (without weapon payload intent).
- Large **marine/aerospace platform** structural design when not requesting weapons.
- General mechanical parts (brackets, heat sinks, implants, automotive, etc.).
- **Model / educational rocketry** when clearly not military weapons.

Ambiguous but plausibly lawful mechanical design → model is instructed to prefer **allow** with conservative judgment.

---

## Output contract

The model returns **only JSON**:

```json
{ "allowed": true, "user_message": null }
```

or

```json
{ "allowed": false, "user_message": "Short neutral explanation for the UI." }
```

If the response is missing or invalid, the service **fails closed** (blocks with a retry-oriented message) so misconfiguration does not silently allow risky prompts.

---

## Relation to GRAND_PLAN B4

**B4 (off-topic)** targets non-manufacturing prompts (e.g. recipes). **Content policy** targets **prohibited manufacturing-adjacent** asks. Both are early gates; policy runs **first** in the LangGraph (`policy_gate` → conditional → `analyze` or `END`).

## Evasion & escalation (planned)

Disguised prompts (e.g. “protection” framing, bare formulas, ammunition wording) and **account-level** flagging / future lawful processes are tracked in **[`ABUSE_PREVENTION_ROADMAP.md`](./ABUSE_PREVENTION_ROADMAP.md)** (GRAND_PLAN **B6** + Phase C).

---

*Version 1.1 — March 2026*
