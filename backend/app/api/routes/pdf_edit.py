"""PDF word-level edit endpoint using PyMuPDF"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import base64
import logging
import re

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


# Section-based editing models
class SectionItem(BaseModel):
    id: str
    text: str
    indent: int = 0
    is_bullet: bool = False


class ResumeSection(BaseModel):
    id: str
    type: str
    title: str
    items: List[SectionItem]
    visible: bool = True
    order: int


class SectionEditRequest(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded original PDF")
    sections: List[ResumeSection] = Field(..., description="Updated sections with new order and content")
    template: Optional[str] = Field(None, description="Template to apply: 'classic' or 'modern'")


class SectionEditResponse(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded edited PDF")
    page_count: int = Field(..., description="Number of pages in output")


class CompressRequest(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded PDF")
    target_pages: int = Field(1, ge=1, description="Target page count")
    aggressive: bool = Field(False, description="Use aggressive compression")


class CompressResponse(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded compressed PDF")
    page_count: int
    removed_items: List[str] = Field(default_factory=list, description="Items removed during compression")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for manual compression")


class ExtractSectionsRequest(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded PDF")


class ExtractSectionsResponse(BaseModel):
    sections: List[Dict[str, Any]]
    page_count: int
    total_chars: int


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


# Section patterns for detection
SECTION_PATTERNS = {
    'contact': r'(?i)^(contact|personal\s*info|info)',
    'summary': r'(?i)^(summary|objective|profile|about\s*me|professional\s*summary)',
    'experience': r'(?i)^(experience|employment|work\s*history|professional\s*experience)',
    'education': r'(?i)^(education|academic|qualification|degree)',
    'skills': r'(?i)^(skills|technical\s*skills|competencies|expertise|technologies)',
    'projects': r'(?i)^(projects|portfolio|personal\s*projects)',
    'certifications': r'(?i)^(certification|certificate|licenses?)',
    'awards': r'(?i)^(awards?|achievements?|honors?)',
    'languages': r'(?i)^(languages?|language\s*skills)',
}


def detect_section_type(text: str) -> str:
    """Detect section type from header text"""
    text = text.strip()
    for section_type, pattern in SECTION_PATTERNS.items():
        if re.match(pattern, text):
            return section_type
    return 'other'


def extract_sections_from_pdf(doc) -> List[Dict[str, Any]]:
    """Extract resume sections from PDF document"""
    sections = []
    current_section = None
    section_order = 0
    
    for page_idx in range(doc.page_count):
        page = doc.load_page(page_idx)
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if block.get("type") != 0:  # Skip non-text blocks
                continue
                
            for line in block.get("lines", []):
                line_text = ""
                line_size = 0
                is_bold = False
                
                for span in line.get("spans", []):
                    line_text += span.get("text", "")
                    line_size = max(line_size, span.get("size", 0))
                    if "bold" in span.get("font", "").lower():
                        is_bold = True
                
                line_text = line_text.strip()
                if not line_text:
                    continue
                
                # Check if this is a section header
                section_type = detect_section_type(line_text)
                is_header = (section_type != 'other' or 
                            (line_size > 12 and is_bold and len(line_text.split()) <= 5))
                
                if is_header and section_type != 'other':
                    # Save previous section
                    if current_section:
                        sections.append(current_section)
                    
                    # Start new section
                    current_section = {
                        'id': f'section-{section_type}-{page_idx}-{section_order}',
                        'type': section_type,
                        'title': line_text,
                        'items': [],
                        'visible': True,
                        'order': section_order,
                        'page_index': page_idx,
                    }
                    section_order += 1
                elif current_section:
                    # Add as item to current section
                    is_bullet = bool(re.match(r'^[\u2022\u2023•\-–—]\s*', line_text))
                    current_section['items'].append({
                        'id': f'item-{len(current_section["items"])}',
                        'text': line_text,
                        'indent': 1 if is_bullet else 0,
                        'is_bullet': is_bullet,
                    })
    
    # Add last section
    if current_section:
        sections.append(current_section)
    
    return sections


@router.post("/extract-sections", response_model=ExtractSectionsResponse)
async def extract_sections(payload: ExtractSectionsRequest):
    """Extract resume sections from PDF for editing"""
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available"
        )
    
    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF data"
        )
    
    try:
        sections = extract_sections_from_pdf(doc)
        
        # Calculate total character count
        total_chars = sum(
            len(s['title']) + sum(len(item['text']) for item in s['items'])
            for s in sections
        )
        
        return ExtractSectionsResponse(
            sections=sections,
            page_count=doc.page_count,
            total_chars=total_chars
        )
    finally:
        doc.close()


@router.post("/apply-section-edits", response_model=SectionEditResponse)
async def apply_section_edits(payload: SectionEditRequest):
    """
    Apply section-based edits to PDF.
    Regenerates PDF with new section order and content.
    """
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available"
        )
    
    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF data"
        )
    
    try:
        # Get page dimensions
        first_page = doc.load_page(0)
        page_width = first_page.rect.width
        page_height = first_page.rect.height
        
        # Create new PDF document
        new_doc = fitz.open()
        current_page = new_doc.new_page(width=page_width, height=page_height)
        
        # Layout settings based on template
        margin_left = 50
        margin_right = 50
        margin_top = 50
        margin_bottom = 50
        line_height = 14
        section_gap = 20
        item_indent = 15
        
        if payload.template == 'modern':
            margin_left = 60
            line_height = 15
        
        current_y = margin_top
        text_width = page_width - margin_left - margin_right
        
        # Sort sections by order and filter visible
        sorted_sections = sorted(
            [s for s in payload.sections if s.visible],
            key=lambda x: x.order
        )
        
        for section in sorted_sections:
            # Check if we need a new page
            if current_y > page_height - margin_bottom - 50:
                current_page = new_doc.new_page(width=page_width, height=page_height)
                current_y = margin_top
            
            # Insert section title
            title_rect = fitz.Rect(margin_left, current_y, page_width - margin_right, current_y + 18)
            current_page.insert_textbox(
                title_rect,
                section.title.upper() if payload.template == 'classic' else section.title,
                fontsize=12 if payload.template == 'modern' else 11,
                fontname="helv-bold" if payload.template == 'modern' else "helv",
                color=(0, 0, 0),
            )
            current_y += 20
            
            # Draw underline for classic template
            if payload.template == 'classic':
                current_page.draw_line(
                    fitz.Point(margin_left, current_y - 5),
                    fitz.Point(page_width - margin_right, current_y - 5),
                    color=(0.5, 0.5, 0.5),
                    width=0.5
                )
            
            # Insert items
            for item in section.items:
                # Check for new page
                if current_y > page_height - margin_bottom - line_height:
                    current_page = new_doc.new_page(width=page_width, height=page_height)
                    current_y = margin_top
                
                item_x = margin_left + (item_indent if item.indent > 0 else 0)
                item_width = text_width - (item_indent if item.indent > 0 else 0)
                
                # Add bullet point
                text = item.text
                if item.is_bullet and not text.startswith('•'):
                    text = f"• {text}"
                
                # Calculate text height
                text_lines = len(text) // 80 + 1
                item_height = line_height * text_lines
                
                item_rect = fitz.Rect(item_x, current_y, item_x + item_width, current_y + item_height + 5)
                current_page.insert_textbox(
                    item_rect,
                    text,
                    fontsize=10,
                    fontname="helv",
                    color=(0.1, 0.1, 0.1),
                )
                current_y += item_height + 3
            
            current_y += section_gap
        
        # Save new document
        output_bytes = new_doc.tobytes()
        encoded = base64.b64encode(output_bytes).decode("utf-8")
        
        return SectionEditResponse(
            pdf_base64=encoded,
            page_count=new_doc.page_count
        )
        
    except Exception as e:
        logger.error(f"Failed to apply section edits: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate PDF"
        )
    finally:
        doc.close()
        if 'new_doc' in locals():
            new_doc.close()


@router.post("/compress-to-one-page", response_model=CompressResponse)
async def compress_to_one_page(payload: CompressRequest):
    """
    Attempt to compress PDF content to fit target page count.
    Uses various strategies: reducing font size, condensing text, removing less important content.
    """
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available"
        )
    
    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF data"
        )
    
    try:
        if doc.page_count <= payload.target_pages:
            # Already within target
            return CompressResponse(
                pdf_base64=payload.pdf_base64,
                page_count=doc.page_count,
                removed_items=[],
                suggestions=[]
            )
        
        # Extract sections
        sections = extract_sections_from_pdf(doc)
        
        # Get page dimensions
        first_page = doc.load_page(0)
        page_width = first_page.rect.width
        page_height = first_page.rect.height
        
        removed_items = []
        suggestions = []
        
        # Strategy 1: Remove items with common filler phrases
        filler_patterns = [
            r'responsible for',
            r'duties included',
            r'helped with',
            r'assisted in',
        ]
        
        for section in sections:
            filtered_items = []
            for item in section['items']:
                text_lower = item['text'].lower()
                is_filler = any(re.search(p, text_lower) for p in filler_patterns)
                if is_filler and payload.aggressive:
                    removed_items.append(f"Removed: {item['text'][:50]}...")
                else:
                    filtered_items.append(item)
            section['items'] = filtered_items
        
        # Strategy 2: Condense bullet points (remove articles, simplify)
        for section in sections:
            for item in section['items']:
                original = item['text']
                # Remove leading articles
                text = re.sub(r'^(The |A |An )', '', item['text'])
                # Condense common phrases
                text = text.replace('in order to', 'to')
                text = text.replace('as well as', 'and')
                text = text.replace('utilized', 'used')
                text = text.replace('implemented', 'built')
                item['text'] = text
        
        # Regenerate PDF with smaller margins and font
        new_doc = fitz.open()
        current_page = new_doc.new_page(width=page_width, height=page_height)
        
        margin = 40  # Tighter margins
        line_height = 12
        section_gap = 12
        current_y = margin
        text_width = page_width - (2 * margin)
        
        for section in sections:
            if not section.get('visible', True):
                continue
                
            if current_y > page_height - margin - 40:
                if new_doc.page_count >= payload.target_pages:
                    suggestions.append("Consider removing older experience or less relevant projects")
                    break
                current_page = new_doc.new_page(width=page_width, height=page_height)
                current_y = margin
            
            # Section title
            title_rect = fitz.Rect(margin, current_y, page_width - margin, current_y + 14)
            current_page.insert_textbox(
                title_rect,
                section['title'].upper(),
                fontsize=10,
                fontname="helv",
                color=(0, 0, 0),
            )
            current_y += 14
            
            # Items
            for item in section['items'][:10]:  # Limit items per section
                if current_y > page_height - margin - line_height:
                    if new_doc.page_count >= payload.target_pages:
                        break
                    current_page = new_doc.new_page(width=page_width, height=page_height)
                    current_y = margin
                
                text = item['text']
                if item.get('is_bullet') and not text.startswith('•'):
                    text = f"• {text}"
                
                # Truncate long items
                if len(text) > 200 and payload.aggressive:
                    text = text[:197] + "..."
                
                text_lines = max(1, len(text) // 90)
                item_height = line_height * text_lines
                
                item_rect = fitz.Rect(margin + 10, current_y, page_width - margin, current_y + item_height + 2)
                current_page.insert_textbox(
                    item_rect,
                    text,
                    fontsize=9,
                    fontname="helv",
                    color=(0.1, 0.1, 0.1),
                )
                current_y += item_height + 2
            
            current_y += section_gap
        
        # Add suggestions based on final state
        if new_doc.page_count > payload.target_pages:
            suggestions.extend([
                "Remove older work experience (>10 years)",
                "Consolidate similar bullet points",
                "Remove less relevant skills or certifications",
                "Shorten professional summary",
            ])
        
        output_bytes = new_doc.tobytes()
        encoded = base64.b64encode(output_bytes).decode("utf-8")
        
        return CompressResponse(
            pdf_base64=encoded,
            page_count=new_doc.page_count,
            removed_items=removed_items,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Failed to compress PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compress PDF"
        )
    finally:
        doc.close()
        if 'new_doc' in locals():
            new_doc.close()


# ============================================================================
# STATELESS PDF GENERATION - For Live Editor WYSIWYG Mode
# ============================================================================

class GeneratePDFRequest(BaseModel):
    """Stateless PDF generation from sections - no original PDF required"""
    sections: List[ResumeSection] = Field(..., description="Sections to render into PDF")
    template: str = Field("classic", description="Template: 'classic' or 'modern'")
    page_size: str = Field("a4", description="Page size: 'a4' or 'letter'")


class GeneratePDFResponse(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded generated PDF")
    page_count: int
    warnings: List[str] = Field(default_factory=list)


@router.post("/generate-from-sections", response_model=GeneratePDFResponse)
async def generate_pdf_from_sections(payload: GeneratePDFRequest):
    """
    Stateless PDF generation from section data.
    
    This endpoint generates a PDF purely from structured section data,
    without needing an original PDF. Used by the WYSIWYG live editor.
    
    Templates:
      - classic: Traditional resume with blue section headers
      - modern: Contemporary design with gradient accents
    """
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available"
        )
    
    try:
        # Determine page dimensions
        if payload.page_size.lower() == "letter":
            page_width = 612  # 8.5 x 11 inches at 72 DPI
            page_height = 792
        else:
            page_width = 595  # A4 at 72 DPI
            page_height = 842
        
        # Template styles
        if payload.template == "modern":
            colors = {
                "header_bg": (0.1, 0.1, 0.15),  # Dark header
                "header_text": (1, 1, 1),
                "section_title": (0.2, 0.4, 0.6),  # Blue-gray
                "body_text": (0.15, 0.15, 0.15),
                "accent": (0.3, 0.5, 0.7),
            }
            margin = 50
            section_title_size = 11
            body_size = 10
            line_height = 14
            section_gap = 18
        else:  # classic
            colors = {
                "header_bg": None,
                "header_text": (0, 0, 0),
                "section_title": (0.1, 0.3, 0.5),  # Blue
                "body_text": (0, 0, 0),
                "accent": (0.2, 0.4, 0.6),
            }
            margin = 55
            section_title_size = 11
            body_size = 10
            line_height = 14
            section_gap = 16
        
        warnings = []
        
        # Create new document
        doc = fitz.open()
        current_page = doc.new_page(width=page_width, height=page_height)
        current_y = margin
        text_width = page_width - (2 * margin)
        
        # Sort sections by order
        sorted_sections = sorted(
            [s for s in payload.sections if s.visible],
            key=lambda s: s.order
        )
        
        for section in sorted_sections:
            # Check if we need a new page
            if current_y > page_height - margin - 60:
                current_page = doc.new_page(width=page_width, height=page_height)
                current_y = margin
            
            # Draw section title with underline
            title_text = section.title.upper()
            title_rect = fitz.Rect(margin, current_y, page_width - margin, current_y + section_title_size + 4)
            
            current_page.insert_textbox(
                title_rect,
                title_text,
                fontsize=section_title_size,
                fontname="helv",
                color=colors["section_title"],
            )
            current_y += section_title_size + 2
            
            # Add underline for section
            if payload.template == "modern":
                # Gradient-style underline (just a colored line)
                current_page.draw_line(
                    fitz.Point(margin, current_y),
                    fitz.Point(margin + 100, current_y),
                    color=colors["accent"],
                    width=1.5
                )
            else:
                # Full-width thin line
                current_page.draw_line(
                    fitz.Point(margin, current_y),
                    fitz.Point(page_width - margin, current_y),
                    color=colors["section_title"],
                    width=0.5
                )
            current_y += 8
            
            # Draw section items
            for item in section.items:
                text = item.text.strip()
                if not text:
                    continue
                
                # Calculate indent
                indent = margin + (item.indent * 15)
                item_width = page_width - margin - indent
                
                # Add bullet if needed
                if item.is_bullet and not text.startswith('•') and not text.startswith('-'):
                    text = f"• {text}"
                
                # Estimate lines needed
                chars_per_line = max(1, int(item_width / 5.5))
                lines_needed = max(1, (len(text) + chars_per_line - 1) // chars_per_line)
                item_height = lines_needed * line_height
                
                # Check for page break
                if current_y + item_height > page_height - margin:
                    current_page = doc.new_page(width=page_width, height=page_height)
                    current_y = margin
                
                item_rect = fitz.Rect(indent, current_y, page_width - margin, current_y + item_height + 4)
                
                current_page.insert_textbox(
                    item_rect,
                    text,
                    fontsize=body_size,
                    fontname="helv",
                    color=colors["body_text"],
                )
                current_y += item_height + 3
            
            current_y += section_gap
        
        # Check for multi-page warning
        if doc.page_count > 1:
            warnings.append(f"Resume spans {doc.page_count} pages. Consider condensing for ATS compatibility.")
        
        # Generate output
        output_bytes = doc.tobytes()
        encoded = base64.b64encode(output_bytes).decode("utf-8")
        
        return GeneratePDFResponse(
            pdf_base64=encoded,
            page_count=doc.page_count,
            warnings=warnings
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )
    finally:
        if 'doc' in locals():
            doc.close()


@router.post("/extract-sections", response_model=ExtractSectionsResponse)
async def extract_sections_endpoint(payload: ExtractSectionsRequest):
    """
    Extract structured sections from an existing PDF.
    Used to populate the live editor with content from uploaded resumes.
    """
    if fitz is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PyMuPDF dependency not available"
        )
    
    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF data"
        )
    
    try:
        sections = extract_sections_from_pdf(doc)
        
        total_chars = sum(
            len(item.get('text', ''))
            for section in sections
            for item in section.get('items', [])
        )
        
        return ExtractSectionsResponse(
            sections=sections,
            page_count=doc.page_count,
            total_chars=total_chars
        )
        
    except Exception as e:
        logger.error(f"Failed to extract sections: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract sections from PDF"
        )
    finally:
        doc.close()