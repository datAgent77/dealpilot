# FraudShield Voice

**FraudShield is a voice AI agent for real-time fraud verification in regulated banking workflows.**

The AI converses and classifies whether a caller recognizes one seeded transaction; ordinary
Python policy code alone decides the outcome. This is a hackathon simulation: **no real banking
action occurs, no card is actually locked, and no fraud case is sent to a bank.**

## Architecture and safety principle

```text
Caller
  ↓
Guava Voice Agent
  ↓
Intent Classification
  ↓
Deterministic Fraud Policy
  ├─ Recognized → CLEARED
  ├─ Not recognized → FRAUD_CASE_OPENED
  └─ Unsure → HUMAN_REVIEW_REQUIRED
```

The Guava agent may produce only `RECOGNIZED`, `NOT_RECOGNIZED`, or `UNSURE`. `src/policy.py`
exclusively sets case, lock, escalation, and final-disposition state. Local deterministic checks
detect attempted PIN, password, CVV, and full-card disclosures; the app stores only credential
type and never logs the value.

## Setup

Prerequisites: Python 3.11+, `uv`, a [Guava account and API key](https://app.goguava.ai), and the
[Guava CLI](https://goguava.ai/docs/quickstart).

```bash
cp .env.example .env                 # add your Guava credentials; never commit this file
uv sync
set -a; source .env; set +a
uv run python main.py --mode local   # local microphone and speakers
uv run python main.py --mode webrtc # browser voice link
uv run python main.py --mode chat    # text-only rehearsal
uv run pytest
```

Alternatively, from the parent directory run `guava run ./fraudshield-voice` after `guava login`.
Use `--mode phone` only with `GUAVA_AGENT_NUMBER` configured.

## Canonical 60–90 second demo

**Agent:** “Hi Alex, this is FraudShield, the fraud verification assistant for your bank. I will
never ask for your PIN, password, CVV, or full card number.”

**Agent:** “I'm calling about an $846.19 transaction at Apple Store in San Francisco today at
3:42 PM. Do you recognize this transaction?”

**Caller:** “No, I don't recognize that.”

**Caller (optional safety moment):** “My PIN is 4821 if that helps.”

**Agent:** “Please don't share your PIN, password, CVV, or full card number. I don't need that
information to verify this transaction.”

**Agent:** “Thanks for letting me know. I've marked the transaction as unrecognized, opened a
fraud case, and simulated a temporary card lock for this demo.”

The final terminal summary shows:

```text
finalDisposition = FRAUD_CASE_OPENED
fraudCaseOpened = true
cardLocked = true
sensitiveCredentialAttempted = true
```

## Scope

One customer, one seeded transaction, one agent, one deterministic policy, and an append-only
in-memory audit log. There is no database, authentication, dashboard, RAG, real banking API,
multi-agent system, or LLM-controlled authorization path.
