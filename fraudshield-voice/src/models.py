"""Typed, deterministic demo data and session state."""

from dataclasses import dataclass
from enum import StrEnum


class RecognitionIntent(StrEnum):
    RECOGNIZED = "RECOGNIZED"
    NOT_RECOGNIZED = "NOT_RECOGNIZED"
    UNSURE = "UNSURE"


class FinalDisposition(StrEnum):
    PENDING = "PENDING"
    CLEARED = "CLEARED"
    FRAUD_CASE_OPENED = "FRAUD_CASE_OPENED"
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"


class CredentialType(StrEnum):
    PIN = "PIN"
    PASSWORD = "PASSWORD"
    CVV = "CVV"
    FULL_CARD_NUMBER = "FULL_CARD_NUMBER"


@dataclass(frozen=True)
class Customer:
    name: str
    last4: str


@dataclass(frozen=True)
class Transaction:
    merchant: str
    amount: float
    currency: str
    location: str
    timestamp_label: str
    transaction_id: str


@dataclass
class SessionState:
    transactionRecognized: bool | None = None
    fraudCaseOpened: bool = False
    cardLocked: bool = False
    humanEscalation: bool = False
    sensitiveCredentialAttempted: bool = False
    finalDisposition: FinalDisposition = FinalDisposition.PENDING


DEMO_CUSTOMER = Customer(name="Alex Morgan", last4="4821")
DEMO_TRANSACTION = Transaction(
    merchant="Apple Store",
    amount=846.19,
    currency="USD",
    location="San Francisco, CA",
    timestamp_label="Today at 3:42 PM",
    transaction_id="txn_demo_001",
)


def transaction_summary(transaction: Transaction = DEMO_TRANSACTION) -> str:
    return (
        f"an ${transaction.amount:,.2f} transaction at {transaction.merchant} "
        f"in {transaction.location.split(',')[0]} "
        f"{transaction.timestamp_label.lower()}"
    )
