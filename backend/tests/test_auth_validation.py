"""
Regression tests for the QA bug batch (BUG-002, 006, 007, 008, 010, 011)
and the password reset feature (BUG-004).

Validation is exercised through the Pydantic schemas directly so no database is
required; the reset flow uses a fake session.
"""

import os
import sys
from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.schemas import (  # noqa: E402
    RegisterRequest,
    ResetPasswordRequest,
)


def _register(username="validuser", email="user@example.com", password="password1"):
    return RegisterRequest(username=username, email=email, password=password)


# ── BUG-006: invalid email format accepted ───────────────────────────────────

class TestEmailValidation:
    @pytest.mark.parametrize(
        "email",
        [
            "user@gmail",        # the exact repro: ".com" removed
            "user@",
            "@example.com",
            "plainstring",
            "user @example.com",
            "",
        ],
    )
    def test_rejects_malformed_email(self, email):
        with pytest.raises(ValidationError):
            _register(email=email)

    def test_accepts_valid_email(self):
        assert _register(email="user@example.com").email == "user@example.com"

    def test_normalizes_case(self):
        # Prevents "User@x.com" and "user@x.com" becoming two accounts.
        assert _register(email="User@Example.COM").email == "user@example.com"


# ── BUG-007: invalid password format accepted ────────────────────────────────

class TestPasswordValidation:
    @pytest.mark.parametrize(
        "password",
        [
            "        ",          # the repro: spaces only
            "abcdefg ",          # letters + space, no digit
            "letters only",      # no digit
            "12345678",          # no letter
            "short1",            # under 8 characters
            "",
        ],
    )
    def test_rejects_weak_password(self, password):
        with pytest.raises(ValidationError):
            _register(password=password)

    def test_accepts_valid_password(self):
        assert _register(password="password1").password == "password1"

    def test_rejects_password_over_bcrypt_byte_limit(self):
        # 4 bytes per emoji: passes an 8-character check but bcrypt would
        # silently truncate it at 72 bytes.
        with pytest.raises(ValidationError):
            _register(password="ab1" + "\U0001f600" * 20)


# ── BUG-008 / BUG-010: invalid username accepted ─────────────────────────────

class TestUsernameValidation:
    @pytest.mark.parametrize(
        "username",
        [
            "@@@",               # BUG-008 repro
            "123",               # BUG-008 repro: digits only
            "has space",         # BUG-010
            "brackets[]",        # BUG-010
            "emoji\U0001f600",   # BUG-010
            "ab",                # under 3 characters
            "-leading",
            "trailing-",
            "x" * 33,
        ],
    )
    def test_rejects_invalid_username(self, username):
        with pytest.raises(ValidationError):
            _register(username=username)

    @pytest.mark.parametrize(
        "username",
        ["validuser", "user_name", "user.name", "user-name", "a1b", "User123"],
    )
    def test_accepts_valid_username(self, username):
        assert _register(username=username).username == username


# ── BUG-004: password reset ──────────────────────────────────────────────────

class FakeQuery:
    def __init__(self, user):
        self._user = user

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self._user


class FakeSession:
    def __init__(self, user=None):
        self._user = user
        self.commits = 0

    def query(self, *_args, **_kwargs):
        return FakeQuery(self._user)

    def commit(self):
        self.commits += 1

    def refresh(self, _obj):
        pass


class FakeUser:
    def __init__(self):
        self.hashed_password = "old-hash"
        self.reset_token_hash = None
        self.reset_token_expires = None


class TestPasswordReset:
    def test_token_is_stored_hashed_not_in_plaintext(self):
        from services.auth_service import create_reset_token

        user = FakeUser()
        token = create_reset_token(FakeSession(user), user)

        assert token
        assert user.reset_token_hash != token
        assert len(user.reset_token_hash) == 64  # sha256 hex
        assert user.reset_token_expires > datetime.utcnow()

    def test_valid_token_sets_password_and_is_single_use(self):
        from services.auth_service import (
            consume_reset_token,
            create_reset_token,
            verify_password,
        )

        user = FakeUser()
        token = create_reset_token(FakeSession(user), user)

        result = consume_reset_token(FakeSession(user), token, "newpassword1")
        assert result is user
        assert verify_password("newpassword1", user.hashed_password)
        # Token is burned, so replaying it fails.
        assert user.reset_token_hash is None
        assert consume_reset_token(FakeSession(None), token, "another1") is None

    def test_expired_token_is_rejected(self):
        from services.auth_service import consume_reset_token, create_reset_token

        user = FakeUser()
        token = create_reset_token(FakeSession(user), user)
        user.reset_token_expires = datetime.utcnow() - timedelta(minutes=1)

        assert consume_reset_token(FakeSession(user), token, "newpassword1") is None
        assert user.hashed_password == "old-hash"

    def test_unknown_token_is_rejected(self):
        from services.auth_service import consume_reset_token

        assert consume_reset_token(FakeSession(None), "bogus", "newpassword1") is None

    def test_reset_enforces_same_password_rule_as_registration(self):
        with pytest.raises(ValidationError):
            ResetPasswordRequest(token="t", password="        ")
        assert ResetPasswordRequest(token="t", password="password1").password == "password1"


# ── BUG-002: ReDoc bundle must be pinned, not a floating tag ─────────────────

class TestReDoc:
    def test_redoc_page_pins_an_exact_bundle_version(self):
        from fastapi.testclient import TestClient
        from main import app

        response = TestClient(app).get("/redoc")
        assert response.status_code == 200
        # "redoc@next" is a floating pre-release tag that currently ships a
        # bundle which fails to boot, leaving the page blank.
        assert "redoc@next" not in response.text
        assert "redoc@2.1.5/bundles/redoc.standalone.js" in response.text


# ── BUG-011: summarizer must answer in the input language ────────────────────

class TestSummarizeLanguage:
    def test_prompt_instructs_model_to_keep_input_language(self):
        from unittest.mock import patch

        from services import summarize_service

        with patch("services.llm_client.llm_chat", return_value="ok") as mock_chat:
            summarize_service._summarize_llm("कुछ पाठ", "paragraph", 150)

        prompt = mock_chat.call_args.kwargs["user_prompt"]
        system = mock_chat.call_args.kwargs["system_prompt"]
        assert "SAME language" in prompt
        assert "Do not translate" in prompt
        assert "same language" in system

    def test_bullet_mode_also_preserves_language(self):
        from unittest.mock import patch

        from services import summarize_service

        with patch("services.llm_client.llm_chat", return_value="ok") as mock_chat:
            summarize_service._summarize_llm("कुछ पाठ", "bullet", 150)

        assert "SAME language" in mock_chat.call_args.kwargs["user_prompt"]
