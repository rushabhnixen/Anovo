"""Outbound email.

Transport is chosen automatically:

1. Brevo's HTTPS API, when BREVO_API_KEY is set. This is the only option that
   works on HuggingFace Spaces, which blocks outbound SMTP ports (25/465/587) to
   prevent spam abuse — a plain smtplib connection there times out at the socket
   layer regardless of credentials.
2. SMTP, when SMTP_HOST is set. Correct for self-hosted deployments where the
   mail ports are open.
3. Neither: the message is written to the log so password reset still works in
   local development without any provider.

Delivery failures are logged and swallowed by the caller — a password reset
endpoint must not reveal whether an address exists, and that includes not
failing differently when mail delivery is broken.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _send_via_brevo(to: str, subject: str, body: str) -> bool:
    """Send through Brevo's HTTPS API (port 443, so not blocked on PaaS hosts)."""
    payload = {
        "sender": {"email": settings.smtp_from, "name": settings.email_from_name},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
    }
    response = httpx.post(
        BREVO_API_URL,
        json=payload,
        headers={
            "api-key": settings.brevo_api_key,
            "accept": "application/json",
            "content-type": "application/json",
        },
        timeout=15.0,
    )
    if response.status_code >= 400:
        # Brevo explains refusals (unverified sender, bad key) in the body, and
        # that detail is what makes this debuggable from the logs.
        logger.error(
            "Brevo rejected the message to %s: HTTP %s %s",
            to, response.status_code, response.text[:300],
        )
        return False

    logger.info("Sent %r to %s via the Brevo API", subject, to)
    return True


def _send_via_smtp(to: str, subject: str, body: str) -> bool:
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

    logger.info("Sent %r to %s via SMTP", subject, to)
    return True


def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True if a provider accepted it."""
    if settings.brevo_api_key:
        return _send_via_brevo(to, subject, body)

    if settings.smtp_configured:
        return _send_via_smtp(to, subject, body)

    logger.warning(
        "No email provider configured; message to %s not sent.\nSubject: %s\n%s",
        to, subject, body,
    )
    return False


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
