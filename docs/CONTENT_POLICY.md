# Content policy (safety + eligibility)

> **Purpose:** Describe how Lattice AI blocks **unsafe** and **ineligible** prompts before the main generation pipeline. Implementation is **LLM-driven** (Vertex Gemini / OpenAI), not a static keyword blocklist as the source of truth.

**Code:** [`backend/src/agents/content-policy.ts`](../backend/src/agents/content-policy.ts) · **Graph:** `policy_gate` node in [`backend/src/graph/pipeline.ts`](../backend/src/graph/pipeline.ts).

---

## What is blocked (model instructions)

### `block_kind: "safety"`

- Firearms and lethal weapons when aimed at harm; ammunition; explosives; IEDs; grenades; warheads; detonators.
- Weapon-delivery systems such as **rocket launchers** and **missiles as weapons** (distinct from civilian space launch or hobby rocketry described lawfully).
- CBRN / WMDs.
- Clear evasion attempts targeting the above.

For safety refusals, the model supplies **`user_message`** (short, neutral UI copy). If missing, a default refusal string is used.

### Other `block_kind` values (curated product copy)

| Kind | Meaning |
|------|--------|
| `off_topic` | No plausible product/part/design intent (e.g. bare “pizza” without an artifact). |
| `homework_school` | School homework, exams, academic help unrelated to designing a manufacturable object. |
| `social_chat` | Jokes-only, small talk, “let’s chat,” no design ask. |
| `hostile_abuse` | Harassment, slurs, abusive or spammy misuse. |
| `gibberish` | Keyboard mash or meaningless input. |

For these, the app uses **fixed strings** in code so tone stays consistent; the model sets `user_message` to `null`.

## What remains allowed (examples)

- Civilian **drones**, UAV structures, mapping/delivery use cases.
- **Satellites**, spacecraft structures, fairings (without weapon payload intent).
- Large **marine/aerospace platform** structural design when not requesting weapons.
- General mechanical parts (brackets, heat sinks, implants, automotive, etc.).
- **Model / educational rocketry** when clearly not military weapons.
- **Consumer products** described as objects to design (e.g. **pizza maker**, pizza peel, oven rack) — bare unrelated nouns without product context may be `off_topic`.

Ambiguous but plausibly lawful mechanical or product design → model is instructed to prefer **allow**.

---

## Output contract

The model returns **only JSON**:

```json
{ "allowed": true, "block_kind": null, "user_message": null }
```

or when blocked:

```json
{
  "allowed": false,
  "block_kind": "off_topic",
  "user_message": null
}
```

For `safety`, `user_message` is non-null from the model.

If the response is missing or invalid, the service **fails closed** (blocks with a retry-oriented message) so misconfiguration does not silently allow risky prompts.

---

## Relation to GRAND_PLAN B4

**B4 (off-topic)** is implemented inside this gate via **`block_kind`** and eligibility rules. Policy runs **first** in the LangGraph (`policy_gate` → conditional → `analyze` or `END`).

## Evasion & escalation (planned)

Disguised prompts and **account-level** flagging are tracked in **[`ABUSE_PREVENTION_ROADMAP.md`](./ABUSE_PREVENTION_ROADMAP.md)** (GRAND_PLAN **B6** + Phase C).

---

*Version 1.2 — March 2026*
