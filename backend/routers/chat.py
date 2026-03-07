from fastapi import APIRouter, HTTPException

from models.schemas import ChatRequest, ChatResponse
from services.chat_service import chat

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse, summary="AI Chat")
def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Send a message to the AI chat assistant powered by Ollama (Llama 3 / Mistral 7B).

    - **message**: The user message (1–2000 characters).
    - **mode**: Chat mode — `general`, `creative`, or `academic`.
    - **history**: Optional conversation history.
    """
    try:
        reply = chat(
            request.message,
            request.mode,
            [{"role": m.role, "content": m.content} for m in request.history],
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ChatResponse(reply=reply, mode=request.mode)
