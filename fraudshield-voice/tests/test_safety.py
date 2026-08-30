import pytest

from src.models import CredentialType
from src.safety import detect_credential_type
from src.session import FraudSession


@pytest.mark.parametrize(
    ("utterance", "expected"),
    [
        ("My PIN is 4821", CredentialType.PIN),
        ("My password is hunter two", CredentialType.PASSWORD),
        ("The CVV is 317", CredentialType.CVV),
        ("My card number is 4111 1111 1111 1111", CredentialType.FULL_CARD_NUMBER),
    ],
)
def test_sensitive_credential_detection(utterance, expected) -> None:
    assert detect_credential_type(utterance) is expected


def test_secret_never_enters_state_or_event_log() -> None:
    secret = "4111111111111111"
    session = FraudSession()
    credential_type = detect_credential_type(f"My card number is {secret}")
    assert credential_type is CredentialType.FULL_CARD_NUMBER
    session.record_sensitive_attempt(credential_type, "utterance-1")
    assert secret not in session.summary()
    assert session.state.sensitiveCredentialAttempted is True
