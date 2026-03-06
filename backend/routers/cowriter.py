from fastapi import APIRouter, HTTPException

from models.schemas import CoWriterRequest, CoWriterResponse
from services.cowriter_service import generate_suggestions

router = APIRouter(prefix="/api", tags=["co-writer"])


@router.post("/co-write", response_model=CoWriterResponse, summary="AI autocomplete")
def cowriter_endpoint(request: CoWriterRequest) -> CoWriterResponse:
    """
    Generate autocomplete suggestions for the given text.

    - **text**: The prompt text to continue (1–2000 characters).
    - **max_tokens**: Maximum tokens to generate per suggestion.
    - **num_suggestions**: Number of suggestions to return (1–5).
    """
    try:
        suggestions = generate_suggestions(
            request.text,
            request.max_tokens,
            request.num_suggestions,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return CoWriterResponse(
        prompt=request.text,
        suggestions=suggestions,
    )
