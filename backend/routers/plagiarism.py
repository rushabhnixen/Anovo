from fastapi import APIRouter, HTTPException

from models.schemas import PlagiarismRequest, PlagiarismResponse
from services.content_advisory import NO_ANALYSABLE_TEXT, advise, refusal
from services.plagiarism_service import check_plagiarism

router = APIRouter(prefix="/api", tags=["plagiarism"])


@router.post("/plagiarism-check", response_model=PlagiarismResponse, summary="Check for plagiarism")
def plagiarism_check_endpoint(request: PlagiarismRequest) -> PlagiarismResponse:
    """
    Compare two texts using semantic similarity to detect potential plagiarism.

    - **text**: The text to check (1–5000 characters).
    - **reference_text**: The reference text to compare against (1–5000 characters).
    """
    # Two identical digit strings score 1.0 — arithmetically right, meaningless
    # as a plagiarism verdict. Refuse rather than report 100% plagiarism.
    declined = (
        refusal(request.text, NO_ANALYSABLE_TEXT)
        or refusal(request.reference_text, NO_ANALYSABLE_TEXT)
    )
    if declined:
        raise HTTPException(status_code=422, detail=declined)

    try:
        result = check_plagiarism(request.text, request.reference_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return PlagiarismResponse(
        text=request.text,
        reference_text=request.reference_text,
        similarity_score=result["similarity_score"],
        is_plagiarized=result["is_plagiarized"],
        threshold=result["threshold"],
        advisory=advise(request.text, min_words=3) or advise(request.reference_text, min_words=3),
        compared_chunks=result.get("compared_chunks", 1),
    )
