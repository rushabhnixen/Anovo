import io
import logging

from docx import Document
from docx.shared import Pt
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.humanize_service import humanize as _humanize
from services.paraphrase_service import paraphrase as _paraphrase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document"])


class DocProcessResponse(BaseModel):
    original_text: str
    processed_text: str
    mode: str
    filename: str


class DocDownloadRequest(BaseModel):
    processed_text: str
    filename: str


@router.post(
    "/upload-doc",
    response_model=DocProcessResponse,
    summary="Upload a Word doc and humanize or paraphrase it",
)
async def upload_doc(
    file: UploadFile = File(...),
    mode: str = Form("humanize"),
):
    """
    Upload a .docx file and process it through humanize or paraphrase.

    Returns JSON with original and processed text for side-by-side comparison.
    Use `/api/upload-doc/download` to get the result as a .docx file.
    """
    if not file.filename or not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    if mode not in ("humanize", "paraphrase"):
        raise HTTPException(status_code=400, detail="Mode must be 'humanize' or 'paraphrase'")

    try:
        content = await file.read()
        doc = Document(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read .docx file: {exc}")

    full_text = "\n\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())

    if not full_text:
        raise HTTPException(status_code=400, detail="Document contains no text")

    if len(full_text) > 50000:
        raise HTTPException(
            status_code=400,
            detail="Document too large. Maximum ~50,000 characters supported.",
        )

    try:
        if mode == "humanize":
            result = _humanize(full_text)
            processed_text = result["humanized"]
        else:
            processed_text, _ = _paraphrase(full_text, intensity=3)
    except Exception as exc:
        logger.exception("Document processing failed")
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")

    return DocProcessResponse(
        original_text=full_text,
        processed_text=processed_text,
        mode=mode,
        filename=file.filename or "document.docx",
    )


@router.post("/upload-doc/download", summary="Download processed text as .docx")
def download_doc(request: DocDownloadRequest):
    """Convert processed text back into a downloadable .docx file."""
    out_doc = Document()
    style = out_doc.styles["Normal"]
    style.font.size = Pt(11)
    style.font.name = "Calibri"

    for paragraph in request.processed_text.split("\n\n"):
        paragraph = paragraph.strip()
        if paragraph:
            out_doc.add_paragraph(paragraph)

    buf = io.BytesIO()
    out_doc.save(buf)
    buf.seek(0)

    out_name = request.filename.replace(".docx", "_processed.docx")

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )
