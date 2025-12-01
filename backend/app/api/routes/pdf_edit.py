"""PDF word-level edit endpoint using PyMuPDF"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import base64
import logging

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdf", tags=["PDF Editing"])


class EditItem(BaseModel):
    page_index: int = Field(..., ge=0, description="Zero-based page index")
    original_text: str = Field(..., min_length=1)
    new_text: str = Field(..., min_length=1)
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0, description="Top-left Y in rendered coordinate space")
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    font_size: Optional[float] = Field(None, gt=0)
    color: Optional[str] = Field(None, description="Hex color like #RRGGBB or RRGGBB")


class ApplyEditsRequest(BaseModel):
    pdf_base64: Optional[str] = Field(None, description="Base64 encoded original PDF")
    edits: List[EditItem] = Field(..., min_items=1)


class ApplyEditsResponse(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded edited PDF")


def hex_to_rgb_tuple(hex_color: Optional[str]) -> tuple:
    """Convert hex color to RGB tuple (0-1 range)"""
    if not hex_color:
        return (0, 0, 0)
    c = hex_color.strip()
    if c.startswith("#"):
        c = c[1:]
    if len(c) != 6:
        logger.warning(f"Invalid color length '{hex_color}', defaulting to black")
        return (0, 0, 0)
    try:
        r = int(c[0:2], 16) / 255.0
        g = int(c[2:4], 16) / 255.0
        b = int(c[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        logger.warning(f"Invalid color value '{hex_color}', defaulting to black")
        return (0, 0, 0)


@router.post("/apply-edits", response_model=ApplyEditsResponse, status_code=status.HTTP_200_OK)
async def apply_edits(payload: ApplyEditsRequest):
    """
    Apply word-level edits to a PDF by rewriting content streams.
    
    Process:
      1. Decode base64 PDF and open with PyMuPDF
      2. Group edits by page
      3. For each edit:
         - Convert frontend coordinates to PDF coordinate system
         - Locate matching word via get_text('words')
         - Add redaction annotation over original word
      4. Apply redactions (removes original text)
      5. Insert new text at the same position
      6. Return updated PDF as base64
    
    This approach ensures true text replacement without overlays.
    """
    if fitz is None:
        logger.error("PyMuPDF not installed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available on server"
        )

    if not payload.pdf_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing pdf_base64 in request"
        )

    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
    except Exception as e:
        logger.error(f"Base64 decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 PDF data"
        )

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted PDF file"
        )

    # Group edits by page
    edits_by_page = {}
    for edit in payload.edits:
        if edit.page_index < 0 or edit.page_index >= doc.page_count:
            logger.warning(f"Skipping edit with invalid page_index {edit.page_index}")
            continue
        edits_by_page.setdefault(edit.page_index, []).append(edit)

    if not edits_by_page:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid edits to apply"
        )

    logger.info(f"Applying edits to {len(edits_by_page)} page(s)")

    try:
        for page_index, edits in edits_by_page.items():
            page = doc.load_page(page_index)
            page_height = page.rect.height

            # Collect insert operations
            insert_ops = []

            # Extract all words from page
            words = page.get_text("words")
            word_entries = [
                {
                    "rect": fitz.Rect(w[0], w[1], w[2], w[3]),
                    "text": w[4]
                }
                for w in words
            ]

            for edit in edits:
                # Convert frontend top-left coordinates to PDF bottom-left
                pdf_y0 = page_height - edit.y - edit.height
                target_rect = fitz.Rect(
                    edit.x,
                    pdf_y0,
                    edit.x + edit.width,
                    pdf_y0 + edit.height
                )

                # Find matching word
                matched_word_rect = None
                for w in word_entries:
                    if w["text"] == edit.original_text and w["rect"].intersects(target_rect):
                        matched_word_rect = w["rect"]
                        break

                if not matched_word_rect:
                    logger.warning(
                        f"No matching word for '{edit.original_text}' on page {page_index} near rect {target_rect}"
                    )
                    continue

                try:
                    # Add redaction annotation with white fill
                    page.add_redact_annot(matched_word_rect, fill=(1, 1, 1))
                    logger.debug(
                        f"Redaction annot added for '{edit.original_text}' at {matched_word_rect} on page {page_index}"
                    )

                    # Prepare text insertion
                    insertion_rect = target_rect
                    fontsize = edit.font_size if edit.font_size else insertion_rect.height * 0.75
                    color_tuple = hex_to_rgb_tuple(edit.color)

                    insert_ops.append(
                        {
                            "rect": insertion_rect,
                            "text": edit.new_text,
                            "fontsize": fontsize,
                            "color": color_tuple
                        }
                    )
                except Exception as ie:
                    logger.error(f"Failed processing edit '{edit.original_text}' on page {page_index}: {ie}")

            # Apply all redactions for this page (removes original text)
            try:
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            except Exception as e:
                logger.error(f"Redaction application failed on page {page_index}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Redaction failed on page {page_index}"
                )

            # Insert new text
            for op in insert_ops:
                try:
                    page.insert_textbox(
                        op["rect"],
                        op["text"],
                        fontsize=op["fontsize"],
                        fontname="helv",
                        color=op["color"],
                        align=0,  # left-aligned
                    )
                except Exception as e:
                    logger.error(f"Text insertion failed on page {page_index}: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Text insertion failed on page {page_index}"
                    )

        # Serialize updated PDF
        try:
            updated_bytes = doc.tobytes()
        except Exception as e:
            logger.error(f"Failed to serialize PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate output PDF"
            )

        encoded = base64.b64encode(updated_bytes).decode("utf-8")
        logger.info("PDF edits applied successfully")

        return ApplyEditsResponse(pdf_base64=encoded)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error during PDF edits: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply edits to PDF"
        )
    finally:
        doc.close()
