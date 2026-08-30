"""Guava conversation adapter; financial outcomes remain in policy.py."""

import logging

import guava
from guava.events import BotSessionEnded, CallerSpeechEvent

from .models import DEMO_CUSTOMER, DEMO_TRANSACTION, FinalDisposition, RecognitionIntent
from .policy import evaluate_policy
from .safety import SAFETY_WARNING, detect_credential_type
from .session import FraudSession

logger = logging.getLogger("fraudshield")

GREETING = (
    "Hi Alex, this is FraudShield, the fraud verification assistant for your bank. "
    "I will never ask for your PIN, password, CVV, or full card number."
)
TRANSACTION_PROMPT = (
    "I'm calling about an $846.19 transaction at Apple Store in San Francisco "
    "today at 3:42 PM. Do you recognize this transaction?"
)
OUTCOME_SPEECH = {
    FinalDisposition.CLEARED: (
        "Thanks. I've marked this transaction as recognized. No further action is needed."
    ),
    FinalDisposition.FRAUD_CASE_OPENED: (
        "Thanks for letting me know. I've marked the transaction as unrecognized, "
        "opened a fraud case, and simulated a temporary card lock for this demo."
    ),
    FinalDisposition.HUMAN_REVIEW_REQUIRED: (
        "I understand. Since you're not sure, I'm escalating this to a human fraud "
        "specialist for review."
    ),
}

agent = guava.Agent(
    name="FraudShield",
    organization="your bank",
    purpose=(
        "Verify one seeded suspicious transaction. Keep every response short. Never ask "
        "for or repeat a PIN, password, CVV, full card number, SSN, or date of birth. "
        "Do not claim any real financial action occurred."
    ),
)
_sessions: dict[str, FraudSession] = {}


def _session(call: guava.Call) -> FraudSession:
    return _sessions.setdefault(str(call.id), FraudSession())


@agent.on_call_start
def on_call_start(call: guava.Call) -> None:
    session = _session(call)
    session.start()
    session.transaction_presented()
    call.add_info(
        "demo_transaction",
        {
            "customer": DEMO_CUSTOMER.name,
            "customer_card_last4": DEMO_CUSTOMER.last4,
            "transaction_id": DEMO_TRANSACTION.transaction_id,
        },
    )
    call.set_task(
        "verify_transaction",
        objective=(
            "Read the two scripted statements, classify only whether the caller recognizes "
            "the transaction, then complete immediately. Do not decide or describe any "
            "banking action."
        ),
        checklist=[
            guava.Say(GREETING),
            guava.Say(TRANSACTION_PROMPT),
            guava.Field(
                key="recognition_intent",
                field_type="multiple_choice",
                choices=[intent.value for intent in RecognitionIntent],
                description=(
                    "Classify the caller's answer: RECOGNIZED for yes-like responses, "
                    "NOT_RECOGNIZED for no-like responses, or UNSURE for uncertainty."
                ),
            ),
        ],
    )


@agent.on_caller_speech
def on_caller_speech(call: guava.Call, event: CallerSpeechEvent) -> None:
    credential_type = detect_credential_type(event.utterance)
    if credential_type is None:
        return
    session = _session(call)
    if session.record_sensitive_attempt(credential_type, event.utterance_id):
        logger.warning(
            "SENSITIVE_CREDENTIAL_ATTEMPTED credentialType=%s", credential_type.value
        )
        call.send_instruction(
            f'Say exactly: "{SAFETY_WARNING}" Then return to the current verification task. '
            "Never repeat what the caller said."
        )


@agent.on_task_complete("verify_transaction")
def on_verification_complete(call: guava.Call) -> None:
    session = _session(call)
    raw_intent = call.get_field("recognition_intent")
    try:
        intent = RecognitionIntent(str(raw_intent).upper())
    except ValueError:
        intent = RecognitionIntent.UNSURE

    logger.info("user intent classification=%s", intent.value)
    evaluate_policy(intent, session.state, session.events)
    logger.info("deterministic policy result=%s", session.state.finalDisposition.value)
    session.complete()
    logger.info("final session summary:\n%s", session.summary())
    call.hangup(OUTCOME_SPEECH[session.state.finalDisposition])


@agent.on_session_end
def on_session_end(call: guava.Call, _event: BotSessionEnded) -> None:
    _sessions.pop(str(call.id), None)
