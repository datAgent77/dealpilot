from src.models import DEMO_CUSTOMER, DEMO_TRANSACTION, FinalDisposition, SessionState


def test_seeded_transaction() -> None:
    assert DEMO_CUSTOMER.name == "Alex Morgan"
    assert DEMO_CUSTOMER.last4 == "4821"
    assert DEMO_TRANSACTION.merchant == "Apple Store"
    assert DEMO_TRANSACTION.amount == 846.19
    assert DEMO_TRANSACTION.currency == "USD"
    assert DEMO_TRANSACTION.location == "San Francisco, CA"
    assert DEMO_TRANSACTION.timestamp_label == "Today at 3:42 PM"
    assert DEMO_TRANSACTION.transaction_id == "txn_demo_001"


def test_initial_session_state() -> None:
    assert SessionState() == SessionState(finalDisposition=FinalDisposition.PENDING)
