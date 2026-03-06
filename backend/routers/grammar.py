from fastapi import APIRouter, HTTPException

from models.schemas import GrammarRequest, GrammarResponse
from services.grammar_service import check_grammar

router = APIRouter(prefix="/api", tags=["grammar"])


@router.post("/grammar-check", response_model=GrammarResponse, summary="Check grammar")
def grammar_check_endpoint(request: GrammarRequest) -> GrammarResponse:
    """
    Check the grammar, spelling, and punctuation of the given text using LanguageTool.

    - **text**: The input text to check (1–5000 characters).
    - **language**: BCP 47 language code, e.g. `en-US`, `de-DE`.
    """
    try:
        errors = check_grammar(request.text, request.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return GrammarResponse(
        original=request.text,
        errors=errors,
        error_count=len(errors),
    )
