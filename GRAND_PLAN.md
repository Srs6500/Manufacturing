# Grand Plan

A running list of improvements and investigations to tackle.

---

## 1. Builder Spec: Make it extensive

The Builder Spec PDF is not currently extensive enough. Expand it to be more comprehensive (e.g. more sections, detail, specs, load estimates, safety info, etc.).

---

## 2. Toxic warning display

Verify that the toxic warning is being displayed correctly after the user submits a prompt. Check the flow and ensure the warning surfaces when applicable.

---

## 3. Material selection variety

**Issue:** When choosing materials in the material-selection step, are we showing only three materials that recur often, or the actual best possible three materials for the use case?

**Action:** If the same three materials keep recurring across different prompts, investigate whether that's:
- A limitation of the API (e.g. LLM/material service)
- A bug in our selection or filtering logic
- Something else

---

## 4. Rejection mechanism for off-topic prompts

If someone submits a manifest prompt that's clearly not related to manufacturing (e.g. "I want to cook pizza"), we should reject it with a clear message instead of trying to process it.

**Action:** Implement a rejection/gate mechanism that detects off-topic or nonsensical prompts and returns a friendly rejection with guidance.

---

*Last updated: Jan 2025*
