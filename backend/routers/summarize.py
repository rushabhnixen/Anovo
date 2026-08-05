from fastapi import APIRouter, HTTPException

from models.schemas import SummarizeRequest, SummarizeResponse
from services.content_advisory import advise
from services.summarize_service import summarize as _summarize

router = APIRouter(prefix="/api", tags=["summarize"])


@router.post("/summarize", response_model=SummarizeResponse, summary="Summarize text")
def summarize_endpoint(request: SummarizeRequest) -> SummarizeResponse:
    """
    Summarize the given text using BART (facebook/bart-large-cnn).

    - **text**: The input text to summarize (50–5000 characters).
    - **mode**: `paragraph` returns a flowing summary; `bullet` returns bullet points.
    - **max_length**: Maximum token length of the generated summary.
    """
    try:
        result = _summarize(request.text, request.mode, request.max_length)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return SummarizeResponse(
        original=request.text,
        summary=result,
        mode=request.mode,
        advisory=advise(request.text),
    )
