"""Authentication service: password hashing, JWT tokens, and password resets."""

import hashlib
import secrets
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from models.db_models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> int | None:
    """Return user_id from token, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, email: str, password: str) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user and verify_password(password, user.hashed_password):
        return user
    return None


# ── Password reset ───────────────────────────────────────────────────────────

def _hash_reset_token(token: str) -> str:
    """Reset tokens are stored hashed so a database leak cannot be replayed."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_reset_token(db: Session, user: User) -> str:
    """Issue a single-use reset token and return the plaintext value.

    Only the hash is persisted. Issuing a new token invalidates any previous
    one, since the stored hash is overwritten.
    """
    token = secrets.token_urlsafe(32)
    user.reset_token_hash = _hash_reset_token(token)
    user.reset_token_expires = datetime.utcnow() + timedelta(
        minutes=settings.reset_token_expire_minutes
    )
    db.commit()
    return token


def consume_reset_token(db: Session, token: str, new_password: str) -> User | None:
    """Validate a reset token, set the new password, and burn the token.

    Returns None when the token is unknown or expired.
    """
    token_hash = _hash_reset_token(token)
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    if not user or not user.reset_token_expires:
        return None
    if user.reset_token_expires < datetime.utcnow():
        # Clear the stale token so it cannot be probed further.
        user.reset_token_hash = None
        user.reset_token_expires = None
        db.commit()
        return None

    user.hashed_password = hash_password(new_password)
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()
    db.refresh(user)
    return user
