import io
import logging

from docx import Document
from docx.shared import Pt
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from services.humanize_service import humanize as _humanize
from services.paraphrase_service import paraphrase as _paraphrase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document"])


@router.post("/upload-doc", summary="Upload a Word doc and humanize or paraphrase it")
async def upload_doc(
    file: UploadFile = File(...),
    mode: str = Form("humanize"),
):
    """
    Upload a .docx file and process it through humanize or paraphrase.

    - **file**: A .docx file
    - **mode**: "humanize" or "paraphrase"

    Returns the processed document as a downloadable .docx.
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

    # Extract paragraphs, process non-empty ones
    processed_paragraphs: list[str] = []
    total_chars = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            processed_paragraphs.append("")
            continue
        total_chars += len(text)
        if total_chars > 50000:
            raise HTTPException(
                status_code=400,
                detail="Document too large. Maximum ~50,000 characters supported.",
            )

    # Process the full text, then split back
    full_text = "\n\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())

    if not full_text:
        raise HTTPException(status_code=400, detail="Document contains no text")

    try:
        if mode == "humanize":
            result = _humanize(full_text)
            processed_text = result["humanized"]
        else:
            processed_text = _paraphrase(full_text, intensity=3)
    except Exception as exc:
        logger.exception("Document processing failed")
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")

    # Build a new .docx with the processed text
    out_doc = Document()
    style = out_doc.styles["Normal"]
    style.font.size = Pt(11)
    style.font.name = "Calibri"

    for paragraph in processed_text.split("\n\n"):
        paragraph = paragraph.strip()
        if paragraph:
            out_doc.add_paragraph(paragraph)

    # Stream the result as a downloadable .docx
    buf = io.BytesIO()
    out_doc.save(buf)
    buf.seek(0)

    out_name = file.filename.replace(".docx", f"_{mode}d.docx")

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )
