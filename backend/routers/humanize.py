from fastapi import APIRouter, HTTPException

from models.schemas import HumanizeRequest, HumanizeResponse
from services.humanize_service import humanize as _humanize

router = APIRouter(prefix="/api", tags=["humanize"])


@router.post("/humanize", response_model=HumanizeResponse, summary="Humanize AI-generated text")
def humanize_endpoint(request: HumanizeRequest) -> HumanizeResponse:
    """
    Transform AI-generated text into more natural, human-sounding writing.

    The pipeline applies:
    1. **Paraphrase** — using T5
    2. **Back-translation** — EN → FR → EN
    3. **Burstiness modulation** — vary sentence lengths
    4. **Human heuristics** — contractions, discourse markers

    - **text**: The AI-generated text to humanize (1–2000 characters).
    """
    try:
        result = _humanize(request.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return HumanizeResponse(
        original=request.text,
        humanized=result["humanized"],
        steps=result.get("steps"),
    )
