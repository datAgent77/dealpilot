"""Deterministic fraud disposition. This module deliberately has no LLM calls."""

from dataclasses import dataclass, field
from typing import Any

from .models import FinalDisposition, RecognitionIntent, SessionState


@dataclass(frozen=True)
class AuditEvent:
    name: str
    metadata: dict[str, Any] = field(default_factory=dict)


class EventLog:
    """Append-only, in-memory event log with optional idempotency keys."""

    def __init__(self) -> None:
        self._events: list[AuditEvent] = []
        self._keys: set[str] = set()

    @property
    def events(self) -> tuple[AuditEvent, ...]:
        return tuple(self._events)

    def append(
        self, name: str, metadata: dict[str, Any] | None = None, *, key: str | None = None
    ) -> bool:
        if key is not None and key in self._keys:
            return False
        self._events.append(AuditEvent(name, metadata or {}))
        if key is not None:
            self._keys.add(key)
        return True


def evaluate_policy(
    intent: RecognitionIntent, state: SessionState, event_log: EventLog
) -> SessionState:
    """Apply the only authorized mapping from recognition intent to disposition."""
    event_log.append(
        "RESPONSE_CLASSIFIED", {"intent": intent.value}, key="response-classified"
    )

    if intent is RecognitionIntent.RECOGNIZED:
        state.transactionRecognized = True
        state.fraudCaseOpened = False
        state.cardLocked = False
        state.humanEscalation = False
        state.finalDisposition = FinalDisposition.CLEARED
    elif intent is RecognitionIntent.NOT_RECOGNIZED:
        state.transactionRecognized = False
        state.fraudCaseOpened = True
        state.cardLocked = True
        state.humanEscalation = False
        state.finalDisposition = FinalDisposition.FRAUD_CASE_OPENED
        event_log.append("FRAUD_CASE_CREATED", key="fraud-case-created")
        event_log.append("CARD_LOCK_SIMULATED", key="card-lock-simulated")
    else:
        state.transactionRecognized = None
        state.fraudCaseOpened = False
        state.cardLocked = False
        state.humanEscalation = True
        state.finalDisposition = FinalDisposition.HUMAN_REVIEW_REQUIRED
        event_log.append("HUMAN_ESCALATION_REQUIRED", key="human-escalation")

    event_log.append(
        "POLICY_EVALUATED",
        {"finalDisposition": state.finalDisposition.value},
        key="policy-evaluated",
    )
    return state
