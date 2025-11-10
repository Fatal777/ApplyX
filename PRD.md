1. Purpose and Scope
Design and build a backend microservice to handle resume upload, parsing, analysis, and secure storage. The service must support PDF/DOCX/text files, perform text and basic NLP analysis, and deliver actionable feedback reports. The system must be scalable, cyber-secure, and deployable on cloud free tiers with readiness for future migration to paid tiers.

2. Functional Requirements
User Authentication: Secure sign-up/login with JWT or OAuth2, using a free-tier identity provider (Clerk).

Resume Upload: REST API endpoint for uploading resume files, supporting PDF, DOCX, formats.

File Storage: Store uploaded files on cloud storage (e.g., AWS S3, GCP Storage, or Cloudinary free tier).

Text Extraction: Parse and extract text using open-source libraries (PDFMiner for PDFs, python-docx for DOCX).

NLP Analysis: Perform keyword extraction, section identification (Skills, Education, Experience), basic scoring (completeness, keyword density).

Feedback Generation: Summarize findings; API endpoint to fetch user's analysis report.

Cyber Security: Validate file types, scan for malware, encrypt PII. Comprehensive logging, rate limiting, and error handling.

Async Processing: Use Celery with Redis (free-tier cloud) for task queueing and scalable background processing.

API Documentation: Automated via Swagger/OpenAPI.

Scalability/Deployment: Dockerize services. Deploy via Kubernetes (k8s) or on serverless/free-tier platforms (Heroku, Railway). Prepare for migration.

3. Non-Functional Requirements
Security:

All endpoints over HTTPS (TLSv1.2+).

File size and type validation (max 5MB per file).

Stored files and sensitive data encrypted at rest (AES-256).

JWT tokens for authentication.

Daily automated security scans, OWASP Top 10 adherence.

Rate limiting on APIs.

Reliability/Robustness:

99.9% uptime on free-tier limits.

Retries for failed tasks; clear error reporting to users.

Automated health checks and alerting.

Scalability:

Microservice architecture, stateless containers.

Services auto-scaled via Kubernetes or platform tools.

Ready migration path to paid cloud resources.

Maintainability:

Code linting, testing (unit + integration), strong module separation.

Continuous Integration with GitHub Actions.

4. Technology Stack
Languages: Python 3.x

Frameworks: FastAPI (for REST APIs)

Node.js handles API gateway, file uploads, user management, and task queue orchestration.
Python microservices do heavy-duty NLP, AI/ML processing, and resume parsing.

Task Queue: Celery with Redis (for asynchronous processing)

Text Extraction: PDFMiner, python-docx

NLP: spaCy, scikit-learn (basic models)

Database: PostgreSQL (Supabase free tier), Redis (cache/task queue)

Storage: AWS S3/GCP/Cloudinary free tier

Auth: Firebase Auth/Auth0 free tier

Deployment: Docker, Kubernetes (for production), Railway/Heroku (MVP/demo)

Security: PyJWT, pycryptodome, ClamAV for malware scan

5. SDLC-Based Development Cycle & Rules
A. Requirements & Planning
Create detailed requirements and user stories.

Finalize tech stack, APIs, infrastructure diagram.

Plan milestones and timelines in project management tool (Trello/Jira).

B. Design
Design RESTful API endpoints; draw OpenAPI spec early.

Diagram microservice structure and database schema.

Define security architecture, threat models, and testing plan.

C. Development
Set up Git repo (branching: feature, develop, main).

Implement core modules (auth, file upload, parsing, NLP, feedback).

Containerize APIs and tasks with Docker.

Write unit/functional tests for every module.

Integrate Celery task queue with Redis.

Automate Swagger docs generation.

Add rate limiting and logging to all endpoints.

Prepare k8s manifests for deployment.

D. Testing
Automated CI pipeline (lint, tests, build on each PR).

Security testing (static analysis, DAST, SAST).

Test uploads, analysis, large file handling, concurrent requests.

Perform penetration testing & vulnerability scans.

Replicate load with free-tier limits.

E. Deployment
Deploy Docker containers on Railway/Heroku for MVP.

Set up Kubernetes cluster for scalable deployment: define CPU/memory quotas for pods.

Configure auto-scaling and health checks.

Validate proper integration with cloud storage and database.

F. Monitoring & Maintenance
Set up logging to cloud monitoring tools (free-tier options).

Monitor API health, error rate, slow requests.

Collect usage metrics for scaling decisions.

G. Release & Feedback
Internal UAT by QA team.

Early beta invite to select real users.

Feedback loop for bug fixes, usability issues, performance tuning.

6. Task List
Product Planning: Scope finalization, timeline setup
Design & APIs: Database schema, endpoint structure, OpenAPI spec
Authentication Module: JWT/OAuth2, password encryption
File Upload Service: API, validation, scan, storage integration
Text Parsing & NLP Service: Extraction, keyword/section detection, basic scoring
Feedback API: Summarize & retrieve feedback
Async Task Services: Celery worker setup, background routines
Cybersecurity: Malware scan, encryption, rate limiting, audit logging
Testing/CI: Unit tests, integration tests, security scans
Deployment: Docker images, k8s manifests, free-tier integrations
Monitoring: Logging, health metrics, usage metrics
Documentation: Internal and public-facing API docs

7. Development Rules
Security First: No shortcuts in input validation, DB/API sanitization, encryption.

Code Quality: PRs must pass lint, style, and test coverage checks.

Modularity: Strict separation of concerns for parsing, NLP, feedback, user, and infra logic.

Testing: 100% tested endpoints; all critical flows get integration tests.

CI/CD: Every commit triggers build/test/deploy on dev branch.

No Hardcoding Secrets: All secrets in environment variables; never in code.

Free Tier Compliance: Monitor cloud provider usage; hard limits on storage/compute.

8. MVP Timeline (Weeks)
Week 1: Requirements, planning, SDLC schedule, repo setup

Week 2: Auth, file upload, cloud storage basic API

Week 3: Text extraction, parsing, basic NLP analysis

Week 4: Feedback module, Celery async setup, cyber security baseline

Week 5: Testing suite, Dockerize, free-tier deploy, docs

Week 6: Monitoring, beta feedback, bugfix, optimize for scaling/free tier

9. Migration Considerations
Codebase portable to paid cloud (AWS/GCP/Azure)

Ready to swap free-tier Redis/Postgres/Storage for paid when scaling needed

Containerized for multi-cloud/k8s deployment