from fastapi import APIRouter, HTTPException

from models.schemas import PlagiarismRequest, PlagiarismResponse
from services.plagiarism_service import check_plagiarism

router = APIRouter(prefix="/api", tags=["plagiarism"])


@router.post("/plagiarism-check", response_model=PlagiarismResponse, summary="Check for plagiarism")
def plagiarism_check_endpoint(request: PlagiarismRequest) -> PlagiarismResponse:
    """
    Compare two texts using semantic similarity to detect potential plagiarism.

    - **text**: The text to check (1–5000 characters).
    - **reference_text**: The reference text to compare against (1–5000 characters).
    """
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
    )
