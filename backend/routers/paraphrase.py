from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import (
    ParaphraseRefineRequest,
    ParaphraseRefineResponse,
    ParaphraseRequest,
    ParaphraseResponse,
)
from routers.auth import _optional_user_id
from services.auth_service import get_user_by_id
from services.content_advisory import advise
from services.paraphrase_service import paraphrase as _paraphrase
from services.paraphrase_service import paraphrase_premium as _paraphrase_premium
from services.paraphrase_service import refine_selection as _refine_selection

router = APIRouter(prefix="/api", tags=["paraphrase"])


@router.post("/paraphrase", response_model=ParaphraseResponse, summary="Paraphrase text")
def paraphrase_endpoint(
    request: ParaphraseRequest,
    user_id: int | None = Depends(_optional_user_id),
    db: Session = Depends(get_db),
) -> ParaphraseResponse:
    """
    Paraphrase the given text with adjustable intensity.

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
            result_text, model_used = _paraphrase_premium(
                request.text,
                request.intensity,
                model=request.model,
                writing_mode=request.writing_mode,
            )
        else:
            result_text, model_used = _paraphrase(
                request.text,
                request.intensity,
                writing_mode=request.writing_mode,
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ParaphraseResponse(
        original=request.text,
        paraphrased=result_text,
        intensity=request.intensity,
        model_used=model_used,
        writing_mode=request.writing_mode,
        # Paraphrasing JSON rewrites keys and values into prose; warn first.
        advisory=advise(request.text),
    )


@router.post(
    "/paraphrase/refine",
    response_model=ParaphraseRefineResponse,
    summary="Suggest contextual sentence or word alternatives",
)
def refine_paraphrase(request: ParaphraseRefineRequest) -> ParaphraseRefineResponse:
    try:
        suggestions = _refine_selection(
            text=request.text,
            selected_text=request.selected_text,
            kind=request.kind,
            writing_mode=request.writing_mode,
            intensity=request.intensity,
            count=request.count,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ParaphraseRefineResponse(
        selected_text=request.selected_text,
        kind=request.kind,
        suggestions=suggestions,
    )
