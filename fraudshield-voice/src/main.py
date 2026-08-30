"""Runtime selector for local audio, WebRTC, phone, or terminal chat."""

import argparse
import os

from guava import logging_utils

from .agent import agent


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the FraudShield Guava agent")
    parser.add_argument(
        "--mode", choices=("local", "webrtc", "phone", "chat"), default="local"
    )
    args = parser.parse_args()
    logging_utils.configure_logging()

    if args.mode == "local":
        agent.call_local()
    elif args.mode == "webrtc":
        code = os.environ.get("GUAVA_WEBRTC_CODE")
        agent.listen_webrtc(code) if code else agent.listen_webrtc()
    elif args.mode == "phone":
        agent.listen_phone(os.environ["GUAVA_AGENT_NUMBER"])
    else:
        agent.chat()
