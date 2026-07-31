from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import CoWriterRequest, CoWriterResponse
from routers.auth import _optional_user_id
from services.auth_service import get_user_by_id
from services.cowriter_service import generate_suggestions

router = APIRouter(prefix="/api", tags=["co-writer"])


@router.post("/co-write", response_model=CoWriterResponse, summary="AI autocomplete")
def cowriter_endpoint(
    request: CoWriterRequest,
    user_id: int | None = Depends(_optional_user_id),
    db: Session = Depends(get_db),
) -> CoWriterResponse:
    """
    Generate autocomplete suggestions for the given text.

    - **text**: The prompt text to continue (1–2000 characters).
    - **max_tokens**: Maximum tokens to generate per suggestion.
    - **num_suggestions**: Number of suggestions to return (1–5).
    """
    if request.model != "standard":
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required for premium mode")
        user = get_user_by_id(db, user_id)
        if not user or not user.is_premium:
            raise HTTPException(status_code=403, detail="Premium subscription required")

    try:
        suggestions, model_used = generate_suggestions(
            request.text,
            request.max_tokens,
            request.num_suggestions,
            request.action,
            request.tone,
            request.model,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return CoWriterResponse(
        prompt=request.text,
        suggestions=suggestions,
        action=request.action,
        tone=request.tone,
        model_used=model_used,
    )
