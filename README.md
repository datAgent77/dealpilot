# DealPilot

**An agent-native used-car marketplace.** Traditional websites make agents navigate pages;
**DealPilot gives agents the tools to understand the market** — search, evaluate, compare, and
negotiate the best deal *with you*. Every consequential action (sending an offer) stays under
human control via the in-page **DealPilot Action Gate**.

Built for the **WebMCP Challenge** (Devpost). Open source under the MIT License.

> **▶ Live demo:** **https://dealpilot-dusky.vercel.app** — open it in **ChatGPT's in-app browser**
> and say: *“Find the best Tesla under $22,000, no salvage, and rank the top three by value.”*

## Why WebMCP

Remove WebMCP and this is just another car site an agent has to click through. With WebMCP, the
site exposes structured tools an agent calls directly — so it researches the market reliably
instead of guessing through the DOM, and consequential calls pause for your approval.

```
Normal agent:  DOM → find filters → fill → click → read cards → open → back → repeat
DealPilot:     search_vehicles → explain_deal → compare_vehicles → (approval) → submit_offer
```

## The 9 WebMCP tools

Registered via `document.modelContext.registerTool(...)`, each behind the deterministic Action
Gate (no LLM decides authorization):

| Tool | Risk | Gate |
|------|------|------|
| `search_vehicles` | READ | AUTO |
| `get_vehicle_details` | READ | AUTO |
| `get_price_history` | READ | AUTO |
| `estimate_fair_value` | READ | AUTO |
| `explain_deal` | READ | AUTO |
| `compare_vehicles` | READ | AUTO |
| `save_vehicle` | WRITE | ALLOW |
| `prepare_offer` | WRITE | ALLOW |
| `submit_offer` | FINANCIAL + OUTREACH | **HUMAN APPROVAL** |

`submit_offer` never sends on its own: it enqueues an approval, returns
`{ status: "AWAITING_HUMAN_APPROVAL", approvalId }` immediately, and only the human's in-page
**Approve** performs the send — **exactly once** (idempotency key = `approvalId`).

## How WebMCP is used (snippet)

```ts
document.modelContext.registerTool({
  name: "explain_deal",
  description: "Explain whether a vehicle is a good deal: a 0-100 deal score with a verdict, the discount vs fair value, and the reasons.",
  inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] },
  annotations: { readOnlyHint: true },
  execute: async ({ vehicleId }) => ({ /* score, verdict, discount, reasons — updates the page too */ }),
}, { signal });
```

All calls go through `lib/webmcp-compat.ts` so the runtime-vs-spec API drift (Chrome parses a JSON
string; the living spec takes an object) is absorbed in one place.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 36 tests (valuation, deal score, tools, gate, approval, e2e, WebMCP contract)
```

## Test WebMCP

**Google Chrome:** enable `chrome://flags/#enable-webmcp-testing`, relaunch, open the app (header
reads **“✓ WebMCP detected”**). In DevTools console:

```js
const s = await dealpilotInvoke("search_vehicles", { make: "Tesla", maxPrice: 22000, excludeSalvage: true });
const ids = JSON.parse(s).results.map(r => r.id).slice(0, 3);
await dealpilotInvoke("compare_vehicles", { vehicleIds: ids });
await dealpilotInvoke("submit_offer", { vehicleId: ids[0], amount: 18500 }); // → approval card appears
```

**ChatGPT in-app browser:** open the deployed URL and ask in natural language — the agent runs the
tools and the page updates live, then pauses on the offer for your approval.

## Architecture

Pure client app — no backend. Next.js 14 (App Router) exported as a static site; a Zustand store
that **both the human UI and the WebMCP tools drive** (one shared surface); a deterministic seed
catalog (~120 vehicles) and an explainable fair-value engine (`lib/valuation.ts`, no LLM); the
Action Gate (`lib/gate.ts`) classifies each call and gates the one consequential action.

```
lib/  valuation · dealScore · catalog · history · store · gate · webmcp-tools · webmcp-compat
components/  market/* (grid, detail, breakdown, compare, offer) · gate/* (ApprovalCard, RiskBadge) · agent/*
```

## Deploy (static)

```bash
npm run build      # emits ./out (fully static)
```

Deploy `./out` to any host — Vercel, Cloudflare Pages, Render (Static Site), or Netlify. No server
or environment variables required.

## License

MIT — see [LICENSE](LICENSE). Newly built during the WebMCP Challenge submission period; no
pre-existing code incorporated.
