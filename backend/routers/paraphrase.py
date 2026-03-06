from fastapi import APIRouter, HTTPException

from models.schemas import ParaphraseRequest, ParaphraseResponse
from services.paraphrase_service import paraphrase as _paraphrase

router = APIRouter(prefix="/api", tags=["paraphrase"])


@router.post("/paraphrase", response_model=ParaphraseResponse, summary="Paraphrase text")
def paraphrase_endpoint(request: ParaphraseRequest) -> ParaphraseResponse:
    """
    Paraphrase the given text using a T5-based model.

    - **text**: The input text to paraphrase (1–2000 characters).
    - **intensity**: Paraphrase intensity from 1 (minimal) to 5 (aggressive).
    """
    try:
        result = _paraphrase(request.text, request.intensity)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ParaphraseResponse(
        original=request.text,
        paraphrased=result,
        intensity=request.intensity,
    )
