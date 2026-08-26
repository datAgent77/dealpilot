# DealPilot

**An agent-native used-car marketplace.** Traditional websites make agents navigate pages;
DealPilot gives agents the tools to understand the market — search, evaluate, compare, and
negotiate the best deal *with you*.

Built for the **WebMCP Challenge** (Devpost). Licensed under MIT.

> **Status: Day-0 spike.** One WebMCP tool (`search_vehicles`) is live to prove the end-to-end
> loop (page ↔ agent). The full build adds fair-value/deal-score tools and an **AgentGate**
> permission layer that gates consequential actions (e.g. `submit_offer`) behind in-page human
> approval.

## The WebMCP tool (spike)

```ts
document.modelContext.registerTool({
  name: "search_vehicles",
  description: "Search the used-car catalog by make, model, max price, max mileage, title status.",
  inputSchema: {
    type: "object",
    properties: {
      make: { type: "string" }, model: { type: "string" },
      maxPrice: { type: "number" }, maxMiles: { type: "number" },
      excludeSalvage: { type: "boolean" },
    },
    required: [],
  },
  annotations: { readOnlyHint: true },
  execute: async (args) => {
    const found = searchVehicles(args);   // filters the catalog and updates the visible page
    return { content: [{ type: "text", text: JSON.stringify(found) }] };
  },
}, { signal });
```

When an agent calls the tool, the page's vehicle list updates and the call shows up in the
**Agent activity** panel — so a human and their agent are working the same surface.

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

## Test WebMCP

**Google Chrome (local):**
1. Open `chrome://flags/#enable-webmcp-testing`, enable it, relaunch Chrome.
2. Open http://localhost:3000 — the header should read **“✓ WebMCP detected.”**
3. Install the **Model Context Tool Inspector** DevTools extension to list/invoke `search_vehicles`
   manually (e.g. `{ "make": "Tesla", "maxPrice": 22000, "excludeSalvage": true }`) and watch the
   page update.

**ChatGPT in-app browser (agent):**
1. Deploy (below) to get a public URL.
2. Open the URL in ChatGPT’s in-app browser (supports WebMCP out of the box).
3. Ask: *“Search for a Tesla Model 3 under $22,000 with no salvage title.”* The agent calls
   `search_vehicles` and the page updates.

## Deploy

Static-friendly Next.js — deploy to any sponsor host:

```bash
# Vercel
npx vercel

# or Render / Cloudflare Pages: build "next build", start "next start"
```

## License

MIT — see [LICENSE](LICENSE).
