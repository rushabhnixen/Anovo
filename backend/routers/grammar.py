from fastapi import APIRouter, HTTPException

from models.schemas import GrammarRequest, GrammarResponse
from services.content_advisory import advise
from services.grammar_service import check_grammar, is_language_supported, resolve_language

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
        # Warns when the input is code or JSON, where applying a "correction"
        # would corrupt the user's file.
        advisory=advise(request.text),
        # Report the language actually checked, since "auto" is resolved here.
        language_supported=is_language_supported(resolve_language(request.text, request.language)),
        checked_language=resolve_language(request.text, request.language),
    )
