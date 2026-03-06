from fastapi import APIRouter, HTTPException

from models.schemas import TranslateRequest, TranslateResponse
from services.translate_service import translate as _translate

router = APIRouter(prefix="/api", tags=["translate"])


@router.post("/translate", response_model=TranslateResponse, summary="Translate text")
def translate_endpoint(request: TranslateRequest) -> TranslateResponse:
    """
    Translate text between languages using Helsinki-NLP OpusMT models.

    - **text**: The input text to translate (1–2000 characters).
    - **source_language**: Source language code (e.g. `en`).
    - **target_language**: Target language code (e.g. `fr`, `de`, `es`).
    """
    try:
        result = _translate(request.text, request.source_language, request.target_language)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return TranslateResponse(
        original=request.text,
        translated=result,
        source_language=request.source_language,
        target_language=request.target_language,
    )
