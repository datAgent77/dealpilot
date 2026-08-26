# DealPilot — P00–P09 Executable Build Prompts

Tuned to a 9-day WebMCP Challenge sprint. Each phase is self-contained: deliverables, key
files, and acceptance criteria. Execute in order; feature-freeze after P07. Standalone project
— **no Ederi code.**

## WebMCP contract (validated live in Chrome, Day-0 spike)

- `document.modelContext` exists only when WebMCP is enabled (Chrome `chrome://flags/#enable-webmcp-testing`
  or ChatGPT's in-app browser). Always guard its absence and show a "not detected" banner.
- `await document.modelContext.registerTool({ name, description, inputSchema, annotations?, execute }, { signal })`
  — returns a Promise; **await + catch** it (an un-awaited rejection on the StrictMode-unmount
  abort throws "AbortError: signal is aborted without reason").
  - `description` ≤ 500 chars. `inputSchema` = JSON Schema (`type/properties/required`).
  - `annotations`: `{ readOnlyHint: true }` on read tools; `{ untrustedContentHint: true }` on
    tools returning user/external text.
  - `execute(args, { signal }) → { content: [{ type: "text", text }] }`. Keep `text` ≤ ~1.5K chars
    (slim the payload). The page should visibly update inside execute so human + agent share state.
- Unregister via the AbortSignal: `controller.abort(new DOMException("unmounted","AbortError"))`.
- Registration must survive React StrictMode double-mount: await+catch, guard `signal.aborted`,
  retry briefly if `modelContext` is injected slightly after load.
- Manual testing (no agent): `getTools()` → RegisteredTool[]; `executeTool(toolObject, JSON.stringify(args))`
  — args is a **JSON string**, first arg is the **tool object** (not the name). Real agents in
  ChatGPT's in-app browser marshal args themselves from the schema.
- **No backend needed.** Pure client app, in-memory deterministic seed, deploy static
  (Vercel / Render / Cloudflare Pages). Judges test the live URL.

North-star test: *"If I remove WebMCP, is it the same product? → No."*
Thesis: *"Traditional websites make agents navigate pages. DealPilot gives agents the tools to
understand the market."*

---

## P00 — Foundation (mostly done in the Day-0 spike)

**Goal:** clean, typed Next.js scaffold with the validated WebMCP registration pattern.
**Deliverables:** Next.js 14 App Router + TS + one global CSS theme; `types/webmcp.d.ts`;
`lib/webmcp.ts` (a `registerAllTools(store, signal)` helper using the validated await+catch
pattern); MIT `LICENSE` (visible in GitHub About); `README.md`; `.gitignore`. Keep the working
`search_vehicles` tool as the reference.
**Acceptance:** `npm run build` clean; page renders; banner flips to "✓ WebMCP detected" in Chrome
with the flag; one tool registers without AbortError.

## P01 — Vehicle domain + deterministic valuation

**Goal:** a believable market and an explainable fair-value engine (own logic, not Ederi).
**Deliverables:**
- `lib/catalog.ts`: deterministic generator for **~120 vehicles** (seeded PRNG; makes/models/
  years/trims/miles/titles/regions), plus a few curated "hero" deals for the demo.
- `lib/valuation.ts`: deterministic `fairValue(v)` = base(model,trim) → year adj → mileage adj
  (saturating) → condition → title (salvage penalty) → region adj. Expose a `breakdown(v)` that
  returns the line items (for explainability). **No LLM in valuation.**
- `lib/dealScore.ts`: deterministic 0–100 deal score from price-vs-fairValue + miles + title.
- Unit tests for valuation monotonicity and dealScore boundaries.
**Acceptance:** ranking is sensible and reproducible; `breakdown()` explains every number.

## P02 — Marketplace UI (the human surface)

**Goal:** a real web experience a person would use — before showing the agent-native version.
**Deliverables:** `components/market/*` — VehicleGrid, VehicleCard (price + value delta badge +
salvage flag), Filters (make/model/maxPrice/maxMiles/title), VehicleDetail (spec + **value
breakdown** + simple price-history sparkline), SavedList, OfferDraft placeholder.
**Acceptance:** a human can search, filter, open a detail, see the fair-value breakdown, and save
a vehicle — entirely without agents.

## P03 — WebMCP READ/RESEARCH tools

**Goal:** the agent can research the market via structured tools (the "understand" story).
**Deliverables:** in `lib/webmcp.ts`, register (all `readOnlyHint`, all update the shared store /
activity log): `search_vehicles`, `get_vehicle_details`, `get_price_history`,
`estimate_fair_value` (returns the breakdown), `calculate_deal_score`, `compare_vehicles`.
**Acceptance:** via ChatGPT in-app browser, "find the best Model 3 under $22k and rank the top 3
by value" drives multiple tool calls; the page and activity log update live.

## P04 — AgentGate: risk engine + activity/audit

**Goal:** the differentiator — make tool calls governable (deterministic, no LLM in the decision).
**Deliverables:** `lib/gate.ts` — `classify(riskClass) → AUTO | CONFIRM | APPROVAL`; a `gate(name,
riskClass, realFn)` wrapper that logs an append-only activity entry with a deterministic risk
score and reason; approval queue with promise-based resolution. `components/agentgate/*` —
ActivityLog, RiskBadge, GatePanel (shows each call + decision + running risk score + audit trail).
**Risk classes:** READ→LOW→AUTO; WRITE(reversible)→LOW→ALLOW; PII→MEDIUM→CONFIRM;
OUTREACH/FINANCIAL→HIGH→APPROVAL.
**Acceptance:** every tool call appears in the panel with its gate decision; risk score explained.

## P05 — Action tools + human approval (the killer flow)

**Goal:** the consequential action stays under human control — filling WebMCP's admitted gap.
**Deliverables:** register `save_vehicle` (WRITE→ALLOW), `prepare_offer` (WRITE→ALLOW, draft only),
`submit_offer` (**HIGH → HUMAN APPROVAL**). For `submit_offer`, `execute` does NOT send: it enqueues
an approval, renders an in-page **ApprovalCard** ("Agent wants to send a $X offer to the seller of
…"), returns `AWAITING_HUMAN_APPROVAL` text to the agent, and only on **Approve** runs the send
**exactly once** (idempotency key = approval id). Deny path returns `DENIED_BY_USER`.
**Acceptance:** approving sends once (no duplicate on replay); denying blocks; the panel shows the
full governed chain.

## P06 — End-to-end money flow + polish

**Goal:** the 60–90s demo runs flawlessly and the approval feels empowering, not like friction.
**Deliverables:** wire the full narrative: *"find the best Tesla under $22k, no salvage, rank top
3, prepare an offer of $18,500 on the best"* → search → rank → compare → prepare_offer →
submit_offer → **approval** → sent. Offer status UI; deny/re-try; idempotent replay proof.
**Acceptance:** the scripted demo prompt completes end-to-end in ChatGPT's in-app browser.

## P07 — Robustness & WebMCP correctness (FEATURE FREEZE after this)

**Goal:** no rough edges under judging.
**Deliverables:** guard `modelContext` absence + retry; StrictMode-safe registration (await+catch,
aborted-guard); every `description` ≤ 500 chars; every `execute` output ≤ ~1.5K chars (slim/truncate);
`untrustedContentHint` on any tool returning listing text; add a favicon (kills the 404); empty/edge
states; mobile layout; optional Chrome **WebMCP evals** for the tools.
**Acceptance:** clean console; tools pass a manual eval pass; mobile OK.

## P08 — Deploy & verify

**Goal:** a public live URL judges can use.
**Deliverables:** deploy to Vercel/Render/Cloudflare Pages; verify in **ChatGPT in-app browser**
AND Chrome flag + DevTools Tool Inspector; README updated with the exact test steps + a
`registerTool` snippet; confirm MIT license shows in the GitHub **About** section.
**Acceptance:** the demo prompt works on the live URL from a cold load.

## P09 — Submission package

**Goal:** ship it.
**Deliverables:** a **<3-min public YouTube demo** with audio (script: problem → normal web →
agent-native research → governed offer → approval → the thesis line); Devpost text description
covering **why WebMCP fits / how it improves UX / what's newly possible / how we implemented
WebMCP**; final checklist. **Feature freeze — no new features.**
**Acceptance:** submitted before the deadline with live URL + repo (MIT in About) + video + text.

---

### Scope guardrails (SwarmOps lesson)
ONE marketplace · ~9 tools · ONE gated action (`submit_offer`) · in-memory seed · no DB/auth/real
offers · no second vertical · **no Ederi.** Clean WebMCP implementation > feature count.
