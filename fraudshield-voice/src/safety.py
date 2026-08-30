"""Local sensitive-credential detection. Secret values are never returned or stored."""

import re

from .models import CredentialType


_LABELED_PATTERNS = (
    (CredentialType.PIN, re.compile(r"\b(?:my\s+)?pin(?:\s+(?:is|number\s+is))?\b", re.I)),
    (CredentialType.PASSWORD, re.compile(r"\b(?:my\s+)?password(?:\s+is)?\b", re.I)),
    (CredentialType.CVV, re.compile(r"\b(?:cvv|cvc|security\s+code)(?:\s+is)?\b", re.I)),
)
_CARD_NUMBER = re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")


def detect_credential_type(text: str) -> CredentialType | None:
    """Return only the credential type; never copy the candidate secret."""
    for credential_type, pattern in _LABELED_PATTERNS:
        if pattern.search(text):
            return credential_type
    if _CARD_NUMBER.search(text):
        return CredentialType.FULL_CARD_NUMBER
    return None


SAFETY_WARNING = (
    "Please don't share your PIN, password, CVV, or full card number. "
    "I don't need that information to verify this transaction."
)
