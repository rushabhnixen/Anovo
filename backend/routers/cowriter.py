from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import CoWriterRequest, CoWriterResponse
from routers.auth import _optional_user_id
from services.auth_service import get_user_by_id
from services.content_advisory import (
    NO_ANALYSABLE_TEXT,
    STRUCTURED_INPUT,
    advise,
    refusal,
)
from services.cowriter_service import (
    directive_advisory,
    generate_suggestions,
    voice_sample_advisory,
)

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

    # The co-writer invents prose. Given "123456789", "@@@@" or a JSON object it
    # produces confident content unrelated to the input, so decline instead.
    declined = refusal(request.text, NO_ANALYSABLE_TEXT + STRUCTURED_INPUT)
    if declined:
        raise HTTPException(status_code=422, detail=declined)

    try:
        suggestions, model_used, truncation_advisory = generate_suggestions(
            request.text,
            request.max_tokens,
            request.num_suggestions,
            request.action,
            request.tone,
            request.model,
            request.instructions,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return CoWriterResponse(
        prompt=request.text,
        suggestions=suggestions,
        action=request.action,
        tone=request.tone,
        model_used=model_used,
        # Most specific first. No min_words: expanding a short seed like
        # "Artificial intelligence" is exactly what the co-writer is for.
        advisory=(
            truncation_advisory
            or advise(request.text)
            or directive_advisory(request.text, request.instructions)
            or voice_sample_advisory(request.text, request.tone)
        ),
    )
