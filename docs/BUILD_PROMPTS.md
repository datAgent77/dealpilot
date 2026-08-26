# DealPilot — P00–P09 Executable Build Prompts (v2)

Tuned to a 9-day WebMCP Challenge sprint. Each phase is self-contained: deliverables, key files,
acceptance criteria. Execute in order; **feature-freeze after P07.** Standalone — **no Ederi code.**

> **Framing (non-negotiable):** this is the **WebMCP Challenge**, not a security hackathon. The
> primary "wow" is *"WebMCP made this marketplace directly operable by an agent."* Action safety
> (the gate) is the **second** message, not a separate security platform.

## WebMCP contract (validated live in Chrome, Day-0 spike)

- `document.modelContext` exists only when WebMCP is enabled (Chrome `chrome://flags/#enable-webmcp-testing`
  or ChatGPT's in-app browser). Guard its absence; show a "not detected" banner.
- `await document.modelContext.registerTool({ name, description, inputSchema, annotations?, execute }, { signal })`
  — returns a Promise; **await + catch** it (an un-awaited rejection on the StrictMode-unmount abort
  throws "AbortError: signal is aborted without reason").
  - `description` ≤ 500 chars (the agent decides *when/how* to use a tool from this — write it well).
  - `inputSchema` = JSON Schema (`type/properties/required`).
  - `annotations`: `{ readOnlyHint: true }` on read tools; `{ untrustedContentHint: true }` on tools
    returning listing/user text.
  - `execute(input, { signal }) → serializable result`. **Do not assume the MCP `{content:[...]}`
    wrapper is required** — Chrome examples return plain values (a string or object) and our spike
    confirmed both work. DealPilot returns a **compact plain object** (slim; keep it ≤ ~1.5K chars).
    Update the page inside `execute` so human + agent share state.
- Unregister via the AbortSignal: `controller.abort(new DOMException("unmounted","AbortError"))`.
  Survive React StrictMode double-mount (await+catch, guard `signal.aborted`, brief retry).

### ⚠ Pre-P00 API-drift fix (do this first — the standard is moving)
Chrome's **deployed** implementation is **runtime truth** for the hackathon, but the **living
spec** differs on invocation, so isolate it:
- Manual/agent invoke: Chrome today = `executeTool(toolObject, JSON.stringify(args))` (args a JSON
  **string**, first arg the **RegisteredTool object** — validated). Living spec IDL = `executeTool(tool,
  inputObject = {})` (an **object**).
- **Put every `registerTool` / `executeTool` / `getTools` call behind `lib/webmcp-compat.ts`** so if
  the API shifts in the final 48h we change **one** file, not 9 tools. The helper: `registerTool()`
  (await+catch+abort-safe), `invokeToolForTest()` (tries string form, falls back to object form),
  `listTools()`.

North-star test: *"Remove WebMCP — is it the same product? → No."*
Thesis: *"Traditional websites make agents navigate pages. DealPilot gives agents the tools to
understand the market."*

---

## P00 — Foundation (mostly done in the Day-0 spike)

**Goal:** clean typed Next.js scaffold + the validated WebMCP pattern isolated behind a compat helper.
**Deliverables:** Next.js 14 App Router + TS + global CSS theme; `types/webmcp.d.ts`;
**`lib/webmcp-compat.ts`** (registerTool/invoke/list, per the drift note); MIT `LICENSE` (visible in
GitHub About); `README.md`; `.gitignore`. Keep the working `search_vehicles` tool as reference, but
route it through the compat helper and switch its return to a plain object.
**Acceptance:** `npm run build` clean; banner flips to "✓ WebMCP detected" with the Chrome flag; one
tool registers (no AbortError); a console invoke via the compat helper updates the page.

## P01 — Vehicle domain + deterministic valuation

**Goal:** a believable market and an explainable fair-value engine (own logic, not Ederi).
**Deliverables:**
- `lib/catalog.ts`: deterministic generator for **~120 vehicles** (seeded PRNG) + curated "hero" deals.
- `lib/valuation.ts`: deterministic `fairValue(v)` = base(model,trim) → year → mileage (saturating) →
  condition → title (salvage penalty) → region; `breakdown(v)` returns explainable line items. **No LLM.**
- `lib/dealScore.ts`: deterministic 0–100 score (internal helper) from price-vs-fairValue + miles + title.
- Unit tests: valuation monotonicity, dealScore boundaries.
**Acceptance:** ranking is sensible + reproducible; `breakdown()` explains every number.

## P02 — Marketplace UI (the human surface)

**Goal:** a real web experience a person would use — before showing the agent-native version.
**Deliverables:** `components/market/*` — VehicleGrid, VehicleCard (price + value-delta badge + salvage
flag), Filters (make/model/maxPrice/maxMiles/title), VehicleDetail (spec + **value breakdown** +
price-history sparkline), SavedList, OfferDraft placeholder.
**Acceptance:** a human can search, filter, open a detail, see the breakdown, save a vehicle — with no agents.

## P03 — WebMCP READ/RESEARCH tools ⭐ (as critical as P05 — the core proof)

**Goal:** prove the thesis — the agent researches the market via structured tools instead of DOM-guessing.
**Tool-design principle:** *expose user intentions, not implementation functions.*
**Deliverables:** register (via compat helper; all `readOnlyHint`; all update the shared store + a live
**AGENT RESEARCH** panel): `search_vehicles`, `get_vehicle_details`, `get_price_history`,
`estimate_fair_value` (returns the breakdown), **`explain_deal`** (score + price/fair-value/discount +
adjustment lines + verdict e.g. "STRONG BUY"), `compare_vehicles`. (`calculate_deal_score` stays an
internal function — not exposed.)
The AGENT RESEARCH panel streams the chain live, e.g.:
`✓ search_vehicles 27 matches · ✓ explain_deal analyzed · ✓ compare_vehicles 3 finalists · best: 14.2% below fair value`.
**Acceptance:** in ChatGPT's in-app browser, *"find the best Model 3 under $22k, rank top 3 by value"*
drives a **multi-tool research chain** and **completes those operations without DOM navigation**; the
page + panel update live.

## P04 — Human-Agent Activity & Action Safety (the "DealPilot Action Gate")

**Goal:** consequential calls stay under human control — deterministic, no LLM in the decision. Keep it
a **feature of the marketplace**, not a separate security console. UI label: **"DealPilot Action Gate."**
**Deliverables:** `lib/gate.ts` — `classify(riskClass) → AUTO | CONFIRM | APPROVAL`; a `gate(name,
riskClass, realFn)` wrapper that appends an activity entry with a deterministic risk reason; approval
registry keyed by id. `components/gate/*` — ActivityLog, RiskBadge, ActionGatePanel.
**Risk classes:** READ→LOW→AUTO; WRITE(reversible)→LOW→ALLOW; PII→MEDIUM→CONFIRM;
OUTREACH/FINANCIAL→HIGH→APPROVAL.
**Acceptance:** every call shows its gate decision; the panel reads as part of DealPilot, not a bolt-on.

## P05 — Action tools + human approval (the killer flow)

**Goal:** fill WebMCP's admitted gap (no enforced confirmation) cleanly — **return-immediately**, no
open-ended promise.
**Deliverables:** register `save_vehicle` (WRITE→ALLOW), `prepare_offer` (WRITE→ALLOW, draft only),
`submit_offer` (**HIGH → APPROVAL**). Crucial semantics:
- `submit_offer` description is explicit: *"Requests submission of an offer to the seller. Requires
  explicit human approval before any seller-facing action occurs."*
- `execute` does NOT send. It creates an approval, renders an in-page **ApprovalCard**, and **returns
  immediately** `{ status: "AWAITING_HUMAN_APPROVAL", approvalId }` — the agent stops.
- On the human's **Approve**, the send runs **exactly once** (idempotency key = approvalId); replay
  returns the same offer. **Deny** → `DENIED_BY_USER`. UI shows OFFER_SENT in the activity log.
- (Optional stretch, only if it stays within 9 tools: a `get_offer_status` read tool. The UI already
  shows state, so likely unnecessary.)
**Acceptance:** approving sends once (no duplicate on replay); denying blocks; `submit_offer` cannot
bypass approval; the panel shows the full governed chain.

## P06 — End-to-end money flow + polish

**Goal:** the ~2:30 demo runs flawlessly; approval feels empowering, not like friction.
**Deliverables:** wire the narrative: *"find the best Tesla under $22k, no salvage, rank top 3, prepare
an $18,500 offer on the best"* → search → explain_deal → compare → prepare_offer → submit_offer →
**approval** → sent. Offer status UI; deny/re-try; idempotent replay proof.
**Acceptance:** the scripted prompt completes end-to-end in ChatGPT's in-app browser.

## P07 — Robustness, WebMCP correctness & contract tests (FEATURE FREEZE after this)

**Goal:** no rough edges under judging.
**Deliverables:** guard `modelContext` absence + retry; StrictMode-safe registration; `description` ≤ 500
chars; `execute` output ≤ ~1.5K chars; `untrustedContentHint` on listing-text tools; favicon (kills the
404); empty/edge states; mobile; optional Chrome **WebMCP evals**.
**WebMCP Contract Tests** (also great in the README):
`✓ unique tool names · ✓ valid JSON Schema · ✓ descriptions present · ✓ read tools have readOnlyHint ·
✓ listing-text tools have untrustedContentHint · ✓ action tools not read-only · ✓ abort leaves no
duplicate registrations · ✓ malformed arguments fail safely · ✓ submit_offer cannot bypass approval ·
✓ duplicate approval cannot duplicate an offer.`
**Acceptance:** clean console; contract tests green; mobile OK.

## P08 — Deploy & verify

**Goal:** a public live URL judges can use — plus a killer gallery screenshot.
**Deliverables:** deploy to Vercel/Render/Cloudflare Pages; verify in **ChatGPT in-app browser** AND
Chrome flag + DevTools Tool Inspector; README with exact test steps + a `registerTool` snippet; MIT in
GitHub **About**. Build a **"WebMCP · 9 TOOLS EXPOSED"** panel (search_vehicles READ … submit_offer
APPROVAL) → screenshot it for the Devpost gallery ("these people built around WebMCP").
**Acceptance:** the demo prompt works on the live URL from a cold load.

## P09 — Submission package

**Goal:** ship it. A **<3-min public YouTube demo** (~2:30) with audio:
- **0:00–0:12** "Shopping sites were built for humans. AI agents have to guess their way through the same UI."
- **0:12–0:25** normal DealPilot UI — "DealPilot works normally for people."
- **0:25–0:35** WebMCP panel: 9 structured tools exposed — "through WebMCP, the same site becomes directly understandable to agents."
- **0:35–1:20** prompt: *"Find the best Tesla under $22k, under 70k miles, clean title. Rank the top three by value."* → tool chain streams live.
- **1:20–1:40** 3-vehicle comparison — "#1 Model 3 — $19,800 — 11.8% below fair value."
- **1:40–2:05** *"Prepare an $18,500 offer."* → prepare → submit → **HUMAN APPROVAL REQUIRED.**
- **2:05–2:17** human **Approve** → **OFFER SENT.**
- **2:17–2:30** activity/audit chain. Close card: **"Websites shouldn't make agents guess. They should give them tools."**
Plus the Devpost text (why WebMCP fits / how it improves UX / what's newly possible / how implemented).
**Feature freeze — no new features.**
**Acceptance:** submitted before the deadline with live URL + repo (MIT in About) + video + text.

---

### Scope guardrails (SwarmOps lesson)
ONE marketplace · **9 tools** · ONE gated action (`submit_offer`) · in-memory seed · no DB/auth/real
offers · no second vertical · **no Ederi.** The last two days are WebMCP reliability + killer demo +
submission — **not new features.** Clean WebMCP implementation > feature count.

### The 9 tools
`search_vehicles` (READ) · `get_vehicle_details` (READ) · `get_price_history` (READ) ·
`estimate_fair_value` (READ) · `explain_deal` (READ) · `compare_vehicles` (READ) ·
`save_vehicle` (WRITE) · `prepare_offer` (WRITE) · `submit_offer` (APPROVAL).
