from fastapi import APIRouter, HTTPException

from models.schemas import GrammarRequest, GrammarResponse
from services.content_advisory import STRUCTURED_INPUT, advise, refusal
from services.grammar_service import check_grammar, is_language_supported, resolve_language

router = APIRouter(prefix="/api", tags=["grammar"])


@router.post("/grammar-check", response_model=GrammarResponse, summary="Check grammar")
def grammar_check_endpoint(request: GrammarRequest) -> GrammarResponse:
    """
    Check the grammar, spelling, and punctuation of the given text using LanguageTool.

    - **text**: The input text to check (1–5000 characters).
    - **language**: BCP 47 language code, e.g. `en-US`, `de-DE`.
    """
    # Grammar "corrections" applied to code or JSON corrupt the user's file, so
    # do not offer any.
    declined = refusal(request.text, STRUCTURED_INPUT)
    if declined:
        raise HTTPException(status_code=422, detail=declined)

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
        advisory=advise(request.text),
        # Report the language actually checked, since "auto" is resolved here.
        language_supported=is_language_supported(resolve_language(request.text, request.language)),
        checked_language=resolve_language(request.text, request.language),
    )
