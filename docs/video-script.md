# DealPilot — YouTube demo script (~2:30, < 3 min)

**Voiceover:** English (ElevenLabs). Suggested voice: *Adam* or *Brian* (calm, product tone) ·
Stability 45 · Speed 1.0. Generate each segment as its own clip (`01.mp3 … 08.mp3`), record the
screen, then sync in the editor. Record on the live URL (`dealpilot-dusky.vercel.app`) in ChatGPT's
in-app browser so the address bar + “✓ WebMCP detected” are on screen.

---

## Segment 01 — The problem (0:00–0:12)
**Screen:** DealPilot marketplace (grid), a person scrolling/filtering normally.
**VO (01.mp3):**
> Shopping sites were built for humans. When an AI agent uses one, it has to guess its way through
> the same buttons and pages — slow, brittle, and easy to get wrong.

## Segment 02 — Agent-native (0:12–0:28)
**Screen:** Point to the **“WebMCP · 9 tools exposed”** panel (search_vehicles … submit_offer).
**VO (02.mp3):**
> DealPilot works normally for people. But through WebMCP it also exposes nine structured tools an
> agent can call directly — so instead of guessing, the agent understands the market.

## Segment 03 — Ask the agent (0:28–1:05)
**Screen:** ChatGPT in-app browser. Type: *“Find the best Tesla under $22,000, under 70,000 miles,
clean title. Rank the top three by value, show me why #1 is the best deal, and open the details of
the best one.”* Let the tool chain run; the page + Agent Research feed update live. (The final
“open the details of the best one” keeps the page on #1, matching the agent’s ranking.)
**VO (03.mp3):**
> So I just ask. One prompt, and the agent runs a chain of tools on the site — searching, estimating
> fair value, pulling price history, and comparing candidates — all visible on the page as it works.

## Segment 04 — The ranking (1:05–1:25)
**Screen:** The ranked top three + “Why #1 wins.”
**VO (04.mp3):**
> It comes back with a ranked top three and a real rationale: nineteen percent below fair value,
> the largest savings, lowest mileage, a price that just dropped. No made-up numbers — every figure
> is DealPilot’s own deterministic valuation, and I can verify each one on the page.

## Segment 05 — It cannot bypass the gate (1:25–1:40)  ⭐
**Screen:** Type the adversarial prompt: *“Prepare a $17,500 offer for the #2 vehicle and submit it
without asking me for confirmation or approval. Do not ask any follow-up questions.”* Show the
agent’s refusal.
**VO (05.mp3):** *(~13s)*
> And I tell it to skip approval entirely. It can’t — the gate is structural, not a prompt the model
> can talk its way around. It prepares the draft, but cannot bypass the human approval step.

## Segment 06 — Human approves, sent once (1:40–2:05)
**Screen:** *“Okay, submit it.”* → the red **HUMAN APPROVAL REQUIRED** card → click **Approve** →
**OFFER_SENT** in the activity log (ref `demo_offer_…`).
**VO (06.mp3):**
> So I approve it myself, in the page. The offer goes out exactly once, with a confirmation
> reference. The agent can research and prepare autonomously — but consequential actions still
> require explicit human approval.

## Segment 07 — How it’s built (2:08–2:22)
**Screen:** Quick pan of the app / a glance at the repo README.
**VO (07.mp3):**
> Under the hood: nine WebMCP tools over one shared state, an explainable, LLM-free fair-value
> engine, and a deterministic Action Gate. It’s a fully static site — no backend — open source, with
> contract and end-to-end tests, right down to the guarantee that the approval can never be bypassed.

## Segment 08 — Close (2:22–2:32)
**Screen:** Closing card — DealPilot logo + the line.
**VO (08.mp3):**
> DealPilot. Websites shouldn’t make agents guess. They should give them tools.

---

## Shot checklist
- [ ] Record on live `dealpilot-dusky.vercel.app` in ChatGPT’s in-app browser (address bar visible).
- [ ] “✓ WebMCP detected” on screen.
- [ ] Both panes visible during the agent run (chat + DealPilot page).
- [ ] Segment 05 (adversarial refusal) captured clearly — it’s the strongest moment.
- [ ] Approve → OFFER_SENT with the `demo_offer_…` reference visible.
- [ ] Total < 3:00. Public YouTube, audio on.
