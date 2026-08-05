"""
Authentication endpoints: register, login, current user, password reset, and
promo code redemption.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    PromoCodeRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from services.auth_service import (
    authenticate_user,
    consume_reset_token,
    create_access_token,
    create_reset_token,
    create_user,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)
from services.mailer import send_password_reset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)

# Deliberately identical whether or not the address is registered, so the
# endpoint cannot be used to enumerate accounts.
_RESET_SENT_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)


def _current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def _optional_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> int | None:
    """Return user_id if a valid token is present, else None (no error)."""
    if not credentials:
        return None
    return decode_token(credentials.credentials)


def _is_admin_email(email: str) -> bool:
    """Check if the given email is in the ADMIN_EMAILS config list."""
    if not settings.admin_emails:
        return False
    return email.strip().lower() in {
        e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()
    }


@router.post("/register", response_model=TokenResponse, summary="Register a new account")
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        if get_user_by_email(db, request.email):
            raise HTTPException(status_code=409, detail="Email already registered")
        if get_user_by_username(db, request.username):
            raise HTTPException(status_code=409, detail="Username already taken")
        user = create_user(db, request.username, request.email, request.password)
        if _is_admin_email(request.email):
            user.is_admin = True
            db.commit()
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)
    except HTTPException:
        raise
    except Exception:
        # Never return the exception text: it leaks SQL, schema and stack detail
        # to unauthenticated callers. Log it server-side instead.
        logger.exception("Registration failed")
        raise HTTPException(status_code=500, detail="Could not create the account. Please try again.")


@router.post("/login", response_model=TokenResponse, summary="Log in")
def login(request: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        user = authenticate_user(db, request.email, request.password)
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        if _is_admin_email(request.email) and not user.is_admin:
            user.is_admin = True
            db.commit()
        token = create_access_token(user.id)
        return TokenResponse(access_token=token)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Login failed")
        raise HTTPException(status_code=500, detail="Could not sign you in. Please try again.")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset link",
)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Email a single-use reset link.

    Always returns the same message so the endpoint cannot be used to discover
    which email addresses have accounts.
    """
    user = get_user_by_email(db, request.email)
    if user:
        try:
            token = create_reset_token(db, user)
            reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
            send_password_reset(
                to=request.email,
                reset_url=reset_url,
                expire_minutes=settings.reset_token_expire_minutes,
            )
        except Exception:
            # A mail outage must not change the response, or it becomes an
            # oracle for which addresses are registered.
            logger.exception("Could not send password reset email")

    return MessageResponse(message=_RESET_SENT_MESSAGE)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Set a new password using a reset token",
)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = consume_reset_token(db, request.token, request.password)
    if not user:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )
    return MessageResponse(message="Your password has been reset. You can now sign in.")


@router.get("/me", response_model=UserResponse, summary="Get current user")
def me(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.delete("/me", status_code=204, summary="Delete current account")
def delete_me(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> None:
    """Permanently delete the signed-in account and its associated history."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.post("/redeem-promo", response_model=UserResponse, summary="Redeem a promo code for premium access")
def redeem_promo(
    request: PromoCodeRequest,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> UserResponse:
    valid_codes = set(
        c.strip().upper()
        for c in settings.premium_promo_codes.split(",")
        if c.strip()
    )
    if not valid_codes:
        raise HTTPException(status_code=404, detail="No promo codes are currently active")

    if request.code.strip().upper() not in valid_codes:
        raise HTTPException(status_code=400, detail="Invalid promo code")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_premium:
        raise HTTPException(status_code=409, detail="Account is already premium")

    user.is_premium = True
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)
