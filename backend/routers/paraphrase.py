from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import ParaphraseRequest, ParaphraseResponse
from routers.auth import _optional_user_id
from services.auth_service import get_user_by_id
from services.paraphrase_service import paraphrase as _paraphrase
from services.paraphrase_service import paraphrase_premium as _paraphrase_premium

router = APIRouter(prefix="/api", tags=["paraphrase"])


@router.post("/paraphrase", response_model=ParaphraseResponse, summary="Paraphrase text")
def paraphrase_endpoint(
    request: ParaphraseRequest,
    user_id: int | None = Depends(_optional_user_id),
    db: Session = Depends(get_db),
) -> ParaphraseResponse:
    """
    Paraphrase the given text with adjustable intensity.

    Set `premium: true` to use the 405B model (requires authentication and premium account).
    """
    use_premium = False

    if request.premium:
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required for premium mode")
        user = get_user_by_id(db, user_id)
        if not user or not user.is_premium:
            raise HTTPException(status_code=403, detail="Premium subscription required")
        use_premium = True

    try:
        if use_premium:
            result = _paraphrase_premium(request.text, request.intensity)
        else:
            result = _paraphrase(request.text, request.intensity)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ParaphraseResponse(
        original=request.text,
        paraphrased=result,
        intensity=request.intensity,
    )
