"""Admin endpoints: user management and site statistics."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.db_models import HistoryEntry, User
from models.schemas import (
    AdminModelInfo,
    AdminModelsResponse,
    AdminStatsResponse,
    AdminUserUpdate,
    UserResponse,
)
from routers.auth import _current_user_id
from services.auth_service import get_user_by_id
from services.llm_client import PREMIUM_MODEL_PROFILES

router = APIRouter(prefix="/api/admin", tags=["admin"])

MODEL_LABELS = {
    "gpt-oss-120b": "GPT-OSS 120B",
    "gpt-oss-20b": "GPT-OSS 20B",
    "qwen-3.6-27b": "Qwen 3.6 27B",
}


def _require_admin(
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that requires the caller to be an admin."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users", response_model=list[UserResponse], summary="List all users")
def list_users(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> list[UserResponse]:
    query = db.query(User)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (User.username.ilike(pattern)) | (User.email.ilike(pattern))
        )
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [UserResponse.model_validate(u) for u in users]


@router.patch("/users/{user_id}", response_model=UserResponse, summary="Update a user")
def update_user(
    user_id: int,
    updates: AdminUserUpdate,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    target = get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if updates.is_premium is not None:
        target.is_premium = updates.is_premium
    if updates.is_admin is not None:
        target.is_admin = updates.is_admin
    db.commit()
    db.refresh(target)
    return UserResponse.model_validate(target)


@router.delete("/users/{user_id}", status_code=204, summary="Delete a user")
def delete_user(
    user_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.query(HistoryEntry).filter(HistoryEntry.user_id == user_id).delete()
    db.delete(target)
    db.commit()


@router.get("/stats", response_model=AdminStatsResponse, summary="Site statistics")
def get_stats(
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    total_users = db.query(func.count(User.id)).scalar() or 0
    premium_users = db.query(func.count(User.id)).filter(User.is_premium.is_(True)).scalar() or 0
    admin_users = db.query(func.count(User.id)).filter(User.is_admin.is_(True)).scalar() or 0
    total_history = db.query(func.count(HistoryEntry.id)).scalar() or 0
    return AdminStatsResponse(
        total_users=total_users,
        premium_users=premium_users,
        admin_users=admin_users,
        total_history_entries=total_history,
    )


@router.get("/models", response_model=AdminModelsResponse, summary="Writing model status")
def model_status(
    admin: User = Depends(_require_admin),
) -> AdminModelsResponse:
    """Return safe, non-secret provider information for the admin dashboard."""
    return AdminModelsResponse(
        provider="Groq",
        provider_configured=bool(settings.groq_api_keys or settings.groq_api_key),
        standard_model=settings.groq_model,
        models=[
            AdminModelInfo(
                id=profile,
                label=MODEL_LABELS[profile],
                provider_model=provider_model,
                status="preview" if profile == "qwen-3.6-27b" else "production",
            )
            for profile, provider_model in PREMIUM_MODEL_PROFILES.items()
        ],
    )
