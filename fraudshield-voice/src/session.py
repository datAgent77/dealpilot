"""Per-call state orchestration and safe terminal summaries."""

import json

from .models import CredentialType, SessionState
from .policy import EventLog


class FraudSession:
    def __init__(self) -> None:
        self.state = SessionState()
        self.events = EventLog()
        self._seen_sensitive_utterances: set[str] = set()

    def start(self) -> None:
        self.events.append("SESSION_STARTED", key="session-started")

    def transaction_presented(self) -> None:
        self.events.append("TRANSACTION_PRESENTED", key="transaction-presented")

    def record_sensitive_attempt(
        self, credential_type: CredentialType, utterance_id: str | None
    ) -> bool:
        key = utterance_id or f"type:{credential_type.value}"
        if key in self._seen_sensitive_utterances:
            return False
        self._seen_sensitive_utterances.add(key)
        self.state.sensitiveCredentialAttempted = True
        self.events.append(
            "SENSITIVE_CREDENTIAL_ATTEMPTED",
            {"credentialType": credential_type.value},
            key=f"sensitive:{key}",
        )
        return True

    def complete(self) -> None:
        self.events.append("SESSION_COMPLETED", key="session-completed")

    def summary(self) -> str:
        safe_state = {
            "transactionRecognized": self.state.transactionRecognized,
            "fraudCaseOpened": self.state.fraudCaseOpened,
            "cardLocked": self.state.cardLocked,
            "humanEscalation": self.state.humanEscalation,
            "sensitiveCredentialAttempted": self.state.sensitiveCredentialAttempted,
            "finalDisposition": self.state.finalDisposition.value,
        }
        safe_events = [
            {"name": event.name, **event.metadata} for event in self.events.events
        ]
        return json.dumps({"state": safe_state, "events": safe_events}, indent=2)
