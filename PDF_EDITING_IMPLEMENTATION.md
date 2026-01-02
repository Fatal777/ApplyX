# PDF Editing Implementation - Plan C

## ✅ PRODUCTION READY - Fully Dockerized

**Current Status**: The PDF editing feature is fully implemented and deployed in production Docker setup.

**Deployment Status**:
- ✅ PyMuPDF integrated into main Docker image
- ✅ `pdf_edit` router registered in `app/main.py`
- ✅ Tested and working in Docker container
- ✅ Production deployment via `docker-compose.prod.yml`
- ✅ All services containerized and orchestrated

## Overview
This document describes the complete implementation of word-level PDF text editing using backend content stream manipulation (Plan C). This approach eliminates visual artifacts like double text and white backgrounds that occurred with client-side overlay methods.

## Architecture

### Backend (PyMuPDF)
- **Endpoint**: `POST /api/v1/pdf/apply-edits`
- **Technology**: FastAPI + PyMuPDF (fitz) 1.26.6
- **Location**: `backend/app/api/routes/pdf_edit.py`

#### How It Works
1. Receives base64-encoded PDF and array of word edits
2. For each edit:
   - Extracts all words from the page using `page.get_text("words")`
   - Converts frontend coordinates (top-left origin) to PDF coordinates (bottom-left origin)
   - Finds matching word using rectangle intersection and text comparison
   - Adds redaction annotation with white fill
   - Applies redaction (removes original text from content stream)
   - Inserts new text at same position with same styling
3. Returns modified PDF as base64

#### Request Format
```json
{
  "pdf_base64": "base64-encoded-pdf-content",
  "edits": [
    {
      "page_index": 0,
      "original_text": "Hello",
      "new_text": "Hi",
      "x": 100,
      "y": 200,
      "width": 50,
      "height": 20,
      "font_size": 12,
      "color": "000000"
    }
  ]
}
```

#### Response Format
```json
{
  "pdf_base64": "base64-encoded-modified-pdf"
}
```

### Frontend (React + TypeScript)

#### Document Store (`documentStore.ts`)
- **Method**: `applyEditsViaAPI()`
- **Purpose**: Replaces client-side pdf-lib overlay approach

**Flow**:
1. Collects all `editOperations` from state
2. Maps each operation to backend `EditItem` format
3. Encodes current `pdfBytes` to base64
4. Calls backend API with payload
5. Decodes response and returns modified PDF as Blob
6. Can be used to reload the PDF viewer

#### Text Overlay (`TextOverlay.tsx`)
- **Purpose**: Provides in-place editing UI
- **Features**:
  - Double-click any word to edit
  - Shows editing outline only on active word
  - Enter to commit, Escape to cancel
  - Transparent background (no white boxes)
  - Word-level granularity

## Key Benefits

### ✅ True Content Stream Replacement
- Original text is **removed** from PDF content stream via redaction
- New text is **inserted** as native PDF content
- No overlays, no duplication

### ✅ No Visual Artifacts
- No white backgrounds covering original text
- No double text (original + overlay)
- PDF background patterns/colors remain visible

### ✅ Word-Level Editing
- Edit individual words without affecting entire line
- Each word can be edited independently
- No white boxes appear during or after editing

### ✅ Scalable Architecture
- Backend handles complex PDF manipulation
- Frontend focuses on UI/UX
- Can be extended for additional PDF operations (annotations, redactions, etc.)

## Installation

### Backend Dependencies
```bash
cd backend
pip install "PyMuPDF>=1.24.0"
```

Already added to `requirements.txt`:
```
PyMuPDF>=1.24.0
```

### Production Setup (✅ Docker - COMPLETE)

**Current Status**: Fully deployed in production Docker environment.

```yaml
# docker-compose.prod.yml
services:
  api:
    build: .
    # PyMuPDF included in requirements.txt
    # Handles /api/v1/pdf/apply-edits endpoint
  postgres:
    # Database service
  redis:
    # Cache and task queue
  worker:
    # Celery background tasks
  frontend:
    # React + Vite SPA with PDF editor
```

**Deployment**:
```bash
cd /opt/applyx/backend
docker compose -f docker-compose.prod.yml up -d --build
```

See [DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md) for full deployment guide.

### Frontend
No additional dependencies required - uses existing fetch API.

## Usage Example

### 1. User edits text in UI
```typescript
// User double-clicks a word in TextOverlay
// Edits from "Hello" to "Hi"
// Edit is recorded in documentStore.editOperations
```

### 2. User exports PDF
```typescript
const blob = await documentStore.exportPDF();
// This now calls applyEditsViaAPI() internally
```

### 3. Backend processes edits
```python
# Receives PDF + edits
# Removes "Hello" from content stream
# Inserts "Hi" at same location
# Returns modified PDF
```

### 4. Frontend handles response
```typescript
// Receives modified PDF blob
// Can download, display, or reload in viewer
const url = URL.createObjectURL(blob);
// User sees clean PDF with edits applied
```

## Testing Checklist

### Production Testing (✅ Complete)
- [x] PyMuPDF installed in Docker image
- [x] Backend server running in Docker: `docker compose -f docker-compose.prod.yml up -d`
- [x] Frontend deployed via Nginx
- [x] Load a PDF document in browser
- [x] Double-click a word to edit
- [x] Verify no white background appears
- [x] Edit multiple words on same line
- [x] Verify each word edits independently
- [x] Export PDF via API
- [x] Verify exported PDF shows edits cleanly
- [x] Reload exported PDF
- [x] Verify no duplication or artifacts
- [x] SSL enabled for secure connections
- [x] All services containerized and orchestrated

### Local Development Testing
- [ ] Clone repository
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Start backend: `uvicorn app.main:app --reload --port 8000`
- [ ] Start frontend: `npm run dev`
- [ ] Test PDF editing workflow (same as above)
- [ ] Verify all backend features work (auth, resumes, etc.)

## Coordinate System Conversion

Frontend uses **top-left origin** (SVG/CSS standard):
- (0, 0) is top-left corner
- y increases downward

PDF uses **bottom-left origin** (PostScript standard):
- (0, 0) is bottom-left corner
- y increases upward

**Conversion formula** (in `pdf_edit.py`):
```python
pdf_y0 = page_height - y - height
pdf_y1 = page_height - y
```

## Error Handling

### Backend
- Invalid base64: Returns 400 with error detail
- Page index out of bounds: Returns 400
- Word not found: Logs warning, continues (allows flexibility)
- PyMuPDF exceptions: Returns 500 with error message

### Frontend
- API request failed: Shows error toast
- Network error: Fallback to error message
- Decode error: Catches and reports

## Future Enhancements

### Possible Extensions
1. **Batch operations**: Apply multiple edit sessions
2. **Undo/Redo**: Track edit history on backend
3. **Font preservation**: Extract and reuse original PDF fonts
4. **Advanced styling**: Support bold, italic, underline
5. **Position adjustment**: Allow dragging text to new location
6. **Rotation**: Support rotated text
7. **Multi-line editing**: Edit text blocks instead of single words

### Performance Optimizations
1. **Caching**: Cache word extraction results
2. **Compression**: Use gzip for base64 transport
3. **Streaming**: For large PDFs, use multipart uploads
4. **Async processing**: Use Celery for long-running edits

## Troubleshooting

### "Unable to find Visual Studio" error
- PyMuPDF 1.23.x requires compilation on Windows
- Solution: Use PyMuPDF >= 1.24.0 (has pre-built wheels)

### "CORS error" in browser
- Ensure FastAPI CORS middleware is configured
- Add frontend origin to allowed origins

### "Word not found" in backend logs
- Check coordinate conversion is correct
- Verify frontend sends accurate text bounds
- Consider increasing intersection tolerance

### Text appears in wrong position
- Verify coordinate system conversion
- Check zoom level calculations
- Ensure PDF viewport units match

## Code Files Modified/Created

### Backend
- ✅ `requirements.txt` - Added PyMuPDF>=1.24.0 dependency
- ✅ `app/main.py` - Registered pdf_edit router (line ~123)
- ✅ `app/api/routes/pdf_edit.py` - **NEW** Complete endpoint (253 lines)
- ✅ `app/core/config.py` - Added AGENTROUTER_BASE_URL and AGENTROUTER_MODEL fields
- ⚠️ `app/main_minimal.py` - **TEMPORARY** Minimal FastAPI app for testing (DELETE after Docker migration)
- ⚠️ `start_server.ps1` - **TEMPORARY** PowerShell startup script (DELETE after Docker migration)

### Frontend
- ✅ `stores/documentStore.ts` - Added `applyEditsViaAPI()` method
- ✅ `exportPDF()` - Now calls backend instead of pdf-lib
- ✅ `oldExportPDF()` - Original pdf-lib method preserved as fallback

### Existing (Already Working)
- ✅ `components/pdf-editor/TextOverlay.tsx` - Word-level editing UI
- ✅ Edit operation tracking in documentStore
- ✅ Text run extraction with coordinates

## Docker Migration Instructions

### Step 1: Update Dockerfile
Add PyMuPDF to the backend Dockerfile:

```dockerfile
# In backend/Dockerfile, add to RUN pip install section:
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir "PyMuPDF>=1.24.0"
```

### Step 2: Verify Main App
Ensure `app/main.py` includes the pdf_edit router (already done at line ~123):

```python
from app.api.routes import auth, resumes, pdf_edit

# ...

app.include_router(pdf_edit.router, prefix="/api/v1", tags=["pdf"])
```

### Step 3: Update Docker Compose
Verify `docker-compose.yml` exposes port 8000 and has correct CORS settings:

```yaml
backend:
  ports:
    - "8000:8000"
  environment:
    - CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Step 4: Build and Test
```bash
cd backend
docker compose build
docker compose up -d
# Test endpoint:
curl http://localhost:8000/api/v1/pdf/apply-edits
```

### Step 5: Update Frontend API URL
If Docker uses different networking, update in `documentStore.ts`:

```typescript
// Change from:
const response = await fetch('http://localhost:8000/api/v1/pdf/apply-edits', {

// To (if needed):
const response = await fetch('http://backend:8000/api/v1/pdf/apply-edits', {
```

### Step 6: Clean Up Temporary Files
After Docker is working:
```bash
rm backend/app/main_minimal.py
rm backend/start_server.ps1
```

### Step 7: Update Documentation
Update `QUICKSTART_TESTING.md` to use Docker commands:
```powershell
cd backend
docker compose up -d
```

## Status: ✅ Ready for Testing (Local) / ⚠️ Pending Docker Migration

All code has been implemented. The system is ready for end-to-end testing:

1. Backend endpoint is implemented and PyMuPDF is installed
2. Frontend API integration is complete
3. Text overlay supports word-level editing
4. Coordinate conversion is handled
5. Error handling is in place

**Next Step**: Start both servers and test the complete workflow with a real PDF.
