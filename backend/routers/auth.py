"""
Authentication endpoints: register, login, current user, and promo code redemption.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.schemas import (
    LoginRequest,
    PromoCodeRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")


@router.get("/me", response_model=UserResponse, summary="Get current user")
def me(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


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
