"""
History endpoints: save and retrieve a user's tool usage history.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import HistoryEntry
from models.schemas import HistoryEntryResponse, SaveHistoryRequest
from services.auth_service import decode_token

router = APIRouter(prefix="/api/history", tags=["history"])
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


@router.get("", response_model=list[HistoryEntryResponse], summary="List history")
def list_history(
    limit: int = 50,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> list[HistoryEntryResponse]:
    """Return the most recent *limit* history entries for the current user."""
    entries = (
        db.query(HistoryEntry)
        .filter(HistoryEntry.user_id == user_id)
        .order_by(HistoryEntry.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        HistoryEntryResponse(
            id=e.id,
            tool=e.tool,
            input_text=e.input_text,
            output_text=e.output_text,
            created_at=e.created_at.isoformat(),
        )
        for e in entries
    ]


@router.post("", response_model=HistoryEntryResponse, status_code=201, summary="Save history entry")
def save_history(
    request: SaveHistoryRequest,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> HistoryEntryResponse:
    """Save a new history entry for the current user."""
    entry = HistoryEntry(
        user_id=user_id,
        tool=request.tool,
        input_text=request.input_text,
        output_text=request.output_text,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return HistoryEntryResponse(
        id=entry.id,
        tool=entry.tool,
        input_text=entry.input_text,
        output_text=entry.output_text,
        created_at=entry.created_at.isoformat(),
    )


@router.delete("/{entry_id}", status_code=204, summary="Delete a history entry")
def delete_history_entry(
    entry_id: int,
    user_id: int = Depends(_current_user_id),
    db: Session = Depends(get_db),
) -> None:
    """Delete a specific history entry (must belong to the current user)."""
    entry = db.query(HistoryEntry).filter(
        HistoryEntry.id == entry_id,
        HistoryEntry.user_id == user_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")
    db.delete(entry)
    db.commit()
