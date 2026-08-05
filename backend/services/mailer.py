"""Outbound email.

When SMTP is configured the message is sent; otherwise it is written to the
application log so password reset works in local development without
credentials. Delivery failures are logged and swallowed by the caller — a
password reset endpoint must not reveal whether an address exists, and that
includes not failing differently when the mail server is down.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True if it was handed to an SMTP server."""
    if not settings.smtp_configured:
        logger.warning(
            "SMTP is not configured; email to %s not sent.\nSubject: %s\n%s",
            to, subject, body,
        )
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)

    logger.info("Sent %r email to %s", subject, to)
    return True


def send_password_reset(to: str, reset_url: str, expire_minutes: int) -> bool:
    """Send the password reset link."""
    body = (
        "We received a request to reset your Anovo password.\n\n"
        f"Reset it here: {reset_url}\n\n"
        f"This link expires in {expire_minutes} minutes and can only be used once.\n"
        "If you did not request this, you can safely ignore this email — "
        "your password will not change."
    )
    return send_email(to, "Reset your Anovo password", body)
