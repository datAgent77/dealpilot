import pytest

from src.models import FinalDisposition, RecognitionIntent, SessionState
from src.policy import EventLog, evaluate_policy


@pytest.mark.parametrize(
    ("intent", "recognized", "case", "locked", "escalated", "disposition"),
    [
        (RecognitionIntent.RECOGNIZED, True, False, False, False, FinalDisposition.CLEARED),
        (
            RecognitionIntent.NOT_RECOGNIZED,
            False,
            True,
            True,
            False,
            FinalDisposition.FRAUD_CASE_OPENED,
        ),
        (
            RecognitionIntent.UNSURE,
            None,
            False,
            False,
            True,
            FinalDisposition.HUMAN_REVIEW_REQUIRED,
        ),
    ],
)
def test_policy_branches(intent, recognized, case, locked, escalated, disposition) -> None:
    state = evaluate_policy(intent, SessionState(), EventLog())
    assert state.transactionRecognized is recognized
    assert state.fraudCaseOpened is case
    assert state.cardLocked is locked
    assert state.humanEscalation is escalated
    assert state.finalDisposition is disposition


def test_policy_side_effect_events_are_idempotent() -> None:
    state, log = SessionState(), EventLog()
    evaluate_policy(RecognitionIntent.NOT_RECOGNIZED, state, log)
    evaluate_policy(RecognitionIntent.NOT_RECOGNIZED, state, log)
    names = [event.name for event in log.events]
    assert names.count("FRAUD_CASE_CREATED") == 1
    assert names.count("CARD_LOCK_SIMULATED") == 1
