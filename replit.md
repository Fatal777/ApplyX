# ApplyX Resume Analyzer

## Project Overview

ApplyX is a full-stack resume analysis application with AI-powered feedback and suggestions. The project consists of:

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python) with PostgreSQL database
- **Key Features**: Resume upload, PDF editing, AI analysis, ATS templates, mock interviews

## Project Structure

```
.
├── frontend/           # React frontend application
│   ├── src/           # Source code
│   ├── public/        # Static assets
│   └── package.json   # Node dependencies
├── backend/           # FastAPI backend
│   ├── app/          # Application code
│   ├── alembic/      # Database migrations
│   └── requirements.txt
└── replit.md         # This file
```

## Current Configuration

### Frontend (Port 5000)
- **URL**: https://88d619a8-d6c4-4eac-9c71-b37d242e37c0-00-21w6tfpinex63.sisko.replit.dev
- **Dev Server**: Vite on port 5000
- **Environment**: Development mode
- **HMR**: Disabled (prevents reload loops in Replit environment)
- **Status**: ✅ Running

### Backend (Port 8000)
- **API URL**: http://localhost:8000
- **Database**: PostgreSQL (Neon) - ✅ Connected
- **Tables**: Created (users, resumes)
- **Status**: ⚠️ Requires additional setup

## Environment Setup

### Frontend Environment Variables
Located in `frontend/.env`:
- `VITE_API_URL`: Backend API URL
- `VITE_SUPABASE_URL`: Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (optional)

### Backend Environment Variables
Located in `backend/.env`:
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)
- `DEBUG`: Development mode (True)
- `SECRET_KEY`: Application secret
- `JWT_SECRET_KEY`: JWT token secret
- `CORS_ORIGINS`: Allowed origins for CORS

## Required External Services

The backend requires the following services to be fully functional:

### Required
1. **PostgreSQL Database** ✅
   - Provided by Replit
   - Tables created automatically

### Required for Authentication
2. **Supabase** (Authentication & Storage)
   - **Required** for user login/signup functionality
   - The app will load without Supabase but authentication features will be disabled
   - Set `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_PROJECT_REF`

### Optional (for enhanced functionality)

3. **Redis** (Caching & Task Queue)
   - Required for Celery background tasks
   - Set `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`

4. **OpenAI API** (AI Analysis)
   - Required for resume analysis and suggestions
   - Set `OPENAI_API_KEY`
   - Alternative: AgentRouter with `AGENTROUTER_API_KEY`

5. **Cloud Storage** (File Storage)
   - AWS S3: Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
   - Or Cloudinary: Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - Falls back to local storage at `/tmp/uploads`

## Development Workflow

### Starting the Application

The frontend is configured to run automatically via Replit Workflows:
- Workflow name: `frontend`
- Command: `cd frontend && npm run dev`
- Port: 5000

### Running the Backend

To start the backend server manually:
```bash
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Database Management

Create/update tables:
```bash
cd backend
python -c "from app.db.database import Base, engine; from app.models.user import User; from app.models.resume import Resume; Base.metadata.create_all(bind=engine)"
```

## Technical Stack

### Frontend Technologies
- React 18.3
- Vite 5.4
- TypeScript 5.8
- Tailwind CSS 3.4
- shadcn/ui (Radix UI components)
- React Router 6.30
- TanStack Query 5.83
- PDF.js, PDF-lib, Fabric.js (PDF editing)
- Three.js (3D backgrounds)

### Backend Technologies
- FastAPI 0.104
- SQLAlchemy 2.0 (ORM)
- Alembic 1.13 (migrations)
- Pydantic 2.5 (validation)
- JWT authentication
- Celery 5.3 (async tasks)
- spaCy, NLTK, scikit-learn (NLP)
- OpenAI API (AI analysis)

## Recent Changes (Nov 11, 2025)

1. ✅ Implemented Professional PDF Editor with Sejda-like Text Replacement:
   - Built comprehensive PDF editor with text detection and replacement
   - Integrated pdf.js for rendering, Fabric.js for text overlay, pdf-lib for export
   - Added demo mode at `/demo/pdf-editor` (no authentication required)
   - Features: click-to-edit text, font detection, drag-and-drop upload
   - Fixed coordinate system alignment between PDF.js and Fabric.js
   
2. ✅ Fixed PDF.js version mismatch error:
   - Aligned pdfjs-dist to exact version 5.4.296 in package.json
   - Updated worker configuration to use CDN URL with matching version
   - Modified PDFViewer.tsx and PDFEditor.tsx to use: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js`
   - This resolves the error: "The API version '5.4.296' does not match the Worker version '5.4.394'"

## Previous Changes (Nov 10, 2025)

1. ✅ Installed Node.js 20 and Python 3.11
2. ✅ Installed all frontend dependencies
3. ✅ Configured Vite for port 5000 with Replit proxy support
4. ✅ Installed all Python backend dependencies
5. ✅ Created PostgreSQL database
6. ✅ Made Supabase configuration optional
7. ✅ Created database tables (users, resumes)
8. ✅ Set up frontend workflow on port 5000
9. ✅ Created environment configuration files
10. ✅ Updated CORS to include Replit domains
11. ✅ Fixed Vite host blocking issue for Replit domain
12. ✅ Disabled HMR to prevent reload loops in Replit environment

## Next Steps

To enable full functionality:

1. **Set up Supabase**:
   - Create a Supabase project
   - Add credentials to `backend/.env` and `frontend/.env`

2. **Configure AI Service**:
   - Obtain OpenAI API key or AgentRouter token
   - Add to `backend/.env`

3. **Set up Redis** (for background tasks):
   - Deploy Redis instance
   - Update `REDIS_URL` in `backend/.env`

4. **Configure Cloud Storage**:
   - Set up AWS S3 or Cloudinary
   - Add credentials to `backend/.env`

## Troubleshooting

### Frontend Issues
- **Port conflict**: Frontend must run on port 5000 for Replit proxy
- **API errors**: Check backend is running and VITE_API_URL is correct
- **Build errors**: Run `npm install` in frontend directory

### Backend Issues
- **Database connection**: Check DATABASE_URL environment variable
- **Import errors**: Ensure all Python packages are installed
- **Missing services**: Check which optional services are needed for your use case

## Project Documentation

- **PRD**: See `PRD.md` for full product requirements
- **README**: See `README.md` for project overview
- **API Docs**: Available at `/docs` when backend is running in debug mode

## Architecture Notes

This application follows a microservices architecture:
- Frontend handles UI/UX and user interactions
- Backend provides REST API endpoints
- Database stores user data and resume information
- Celery workers process resumes asynchronously
- External services provide AI, storage, and caching

The codebase is designed for scalability and can be deployed to production platforms like AWS, GCP, or Azure with proper configuration.
