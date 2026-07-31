from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import HumanizeRequest, HumanizeResponse
from routers.auth import _optional_user_id
from services.auth_service import get_user_by_id
from services.humanize_service import humanize as _humanize
from services.humanize_service import humanize_premium as _humanize_premium

router = APIRouter(prefix="/api", tags=["humanize"])


@router.post("/humanize", response_model=HumanizeResponse, summary="Humanize AI-generated text")
def humanize_endpoint(
    request: HumanizeRequest,
    user_id: int | None = Depends(_optional_user_id),
    db: Session = Depends(get_db),
) -> HumanizeResponse:
    """
    Transform AI-generated text into more natural, human-sounding writing.

    Set `model` to a supported Anovo model profile to use premium mode
    (requires authentication and premium account).
    """
    use_premium = request.model != "standard"

    if use_premium:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required for premium mode")
        user = get_user_by_id(db, user_id)
        if not user or not user.is_premium:
            raise HTTPException(status_code=403, detail="Premium subscription required")

    try:
        if use_premium:
            result = _humanize_premium(request.text, model=request.model)
        else:
            result = _humanize(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return HumanizeResponse(
        original=request.text,
        humanized=result["humanized"],
        steps=result.get("steps"),
        model_used=result.get("model_used", "standard"),
    )
