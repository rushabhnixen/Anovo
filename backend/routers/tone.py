from fastapi import APIRouter, HTTPException

from models.schemas import ToneRequest, ToneResponse, ToneScore
from services.content_advisory import (
    NO_ANALYSABLE_TEXT,
    STRUCTURED_INPUT,
    advise,
    refusal,
)
from services.tone_service import detect_tone

router = APIRouter(prefix="/api", tags=["tone"])


@router.post("/tone-detect", response_model=ToneResponse, summary="Detect text tone")
def tone_detect_endpoint(request: ToneRequest) -> ToneResponse:
    """
    Classify the tone of the given text using the live LLM cascade and a fast
    deterministic fallback for unavailable or malformed provider responses.

    - **text**: The input text to analyze (1–5000 characters).

    Returns ranked tone labels with confidence scores.
    """
    # A tone score is a verdict. Returning one for "123456789" or a JSON blob
    # is confidently wrong, so decline instead of scoring it.
    declined = refusal(request.text, NO_ANALYSABLE_TEXT + STRUCTURED_INPUT)
    if declined:
        raise HTTPException(status_code=422, detail=declined)

    try:
        result = detect_tone(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ToneResponse(
        text=request.text,
        tones=[ToneScore(**t) for t in result["tones"]],
        primary_tone=result["primary_tone"],
        # Anything still scored is prose; this only flags very short input.
        advisory=advise(request.text, min_words=3),
    )
