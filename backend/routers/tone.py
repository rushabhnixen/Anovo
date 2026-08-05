from fastapi import APIRouter, HTTPException

from models.schemas import ToneRequest, ToneResponse, ToneScore
from services.content_advisory import advise
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
    try:
        result = detect_tone(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ToneResponse(
        text=request.text,
        tones=[ToneScore(**t) for t in result["tones"]],
        primary_tone=result["primary_tone"],
        # Digits, emoji or JSON still get scored, but the caller is told the
        # score is not meaningful.
        advisory=advise(request.text, min_words=3),
    )
