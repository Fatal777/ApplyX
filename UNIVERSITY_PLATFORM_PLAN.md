# ApplyX — University & College Platform Plan

> **Target**: Pitch ApplyX as a campus-wide placement readiness platform to universities, colleges, and training institutes across India.

---

## 1. Value Proposition

Universities struggle with:
- Low student placement rates due to poor resume quality and interview preparedness
- Manual, Excel-based placement tracking with no real-time visibility
- No measurable way to track "placement readiness" before drives begin
- NAAC/AICTE accreditation demands placement data that's hard to compile

**ApplyX solves all four** by giving every student AI-powered resume building + mock interviews, and giving the placement cell a live analytics dashboard.

---

## 2. Existing Features Already Valuable to Colleges

| Feature | Student Value | College Value |
|---------|--------------|---------------|
| **Resume Builder + ATS Scoring** | Build job-ready resumes, see instant ATS score | Track which students are resume-ready |
| **Live PDF Editor** | Polish resumes in real-time | Ensure consistent quality |
| **AI Mock Interviews (Voice)** | Practice with realistic AI interviewer | Measure interview preparedness |
| **Job Matching** | Discover relevant openings | Align curriculum with market demand |
| **Application Tracking** | Kanban-style job pipeline | Know who applied where |

---

## 3. New Features to Build

### Phase 1 — College Admin Portal (MVP for Pitch)

#### 3.1 Institution Model + Multi-Tenant Isolation
- New DB table: `institutions`
  - `id`, `name`, `type` (university/college/institute), `logo_url`, `domain`
  - `placement_officer_name`, `placement_officer_email`
  - `departments[]` (JSON), `subscription_plan`, `max_students`
  - `created_at`, `is_active`
- Add `institution_id` FK to `users` table (nullable — existing users remain unlinked)
- All API queries scoped by `institution_id` for college admin endpoints
- **Files**: `backend/app/models/institution.py`, `backend/app/api/routes/institutions.py`

#### 3.2 College Admin Dashboard
- Replace the marketing-only `CollegeSolutions.tsx` with a real dashboard
- **Metrics Cards**:
  - Total students registered
  - Resumes uploaded (% of students)
  - Average ATS score across all students
  - Mock interviews completed (% of students)
  - Average interview score
  - Placement rate (offers / registered)
- **Charts**:
  - Department-wise readiness heatmap
  - Resume score distribution (histogram)
  - Interview score trends (line chart, weekly)
  - Year-over-year placement comparison
- **Export**: PDF report generator (AICTE/NAAC-compatible format)
- **Files**: `frontend/src/pages/CollegeDashboard.tsx`, `backend/app/api/routes/college_admin.py`

#### 3.3 Bulk Student Onboarding
- CSV upload: `name, email, department, enrollment_year, cgpa`
- Auto-generate invite emails with college-branded signup link
- Students auto-linked to institution on first login (via email domain or invite token)
- Batch management: "Class of 2027", "CS-A Section"
- **Files**: `frontend/src/components/college/BulkUpload.tsx`, `backend/app/api/routes/college_students.py`

#### 3.4 Student Readiness View (College Admin)
- Table of all students with columns:
  - Name, Department, Batch, CGPA
  - Resume Uploaded (✓/✗), ATS Score, Mock Interviews Taken, Avg Interview Score
  - Readiness Status: 🟢 Ready / 🟡 Needs Work / 🔴 Not Started
- Filter by department, batch, readiness level
- Drill-down to individual student's resume + interview history
- Alert system: flag students with <50 ATS score or 0 interviews taken
- **Files**: `frontend/src/pages/StudentReadiness.tsx`

---

### Phase 2 — Placement Drive Management

#### 3.5 Placement Drive Model
- New DB table: `placement_drives`
  - `id`, `institution_id`, `company_name`, `company_logo`
  - `drive_date`, `registration_deadline`
  - `eligibility_criteria` (JSON: min_cgpa, departments[], max_backlogs, batch_year)
  - `job_description`, `package_offered`, `roles[]`
  - `rounds[]` (JSON: aptitude, technical, HR, group discussion)
  - `status` (upcoming/active/completed/cancelled)
- New DB table: `drive_registrations`
  - `drive_id`, `student_id`, `status` (registered/shortlisted/selected/rejected)
  - `round_results` (JSON: per-round scores/status)
- Auto-filter eligible students when a drive is created
- Push notifications to eligible students

#### 3.6 Company/Recruiter Portal
- Companies register interest for a specific college
- Upload JDs, set eligibility, view anonymized student profiles
- Shortlist students based on ATS scores + interview scores
- Schedule interview slots via the platform
- New role: `recruiter` (scoped to drives they're linked to)

#### 3.7 Interview Assignments
- College admin can create "mock interview assignments"
  - Deadline, mandatory for specific batches/departments
  - Completion tracking on the readiness dashboard
- For actual drives: schedule real interview slots with company recruiters
- Results visible to placement cell

---

### Phase 3 — Analytics & Differentiation

#### 3.8 Leaderboard & Gamification
- College-wide leaderboard: composite score (resume ATS + interview score)
- Badges: "Interview Ready", "Top 10%", "Resume Master", "5-Interview Streak"
- Department competitions (CS vs ECE vs MBA)
- Weekly email digests with position changes
- **Why**: Drives organic adoption — students compete and invite peers

#### 3.9 Skills Gap Analysis (College-Level)
- Aggregate all student resumes → extract skills inventory
- Compare against job market demand (from scraped JDs)
- Report: "45% of CS students lack Docker/Kubernetes" or "Only 12% have ML experience"
- Recommend training programs / courses
- **Pitch value**: Colleges can align curriculum with industry needs

#### 3.10 Alumni Tracking
- Post-placement data: salary, company, role, city
- Longitudinal tracking for accreditation reports
- Alumni directory for current students (mentorship-ready)
- Alumni can contribute to mock interview question banks

#### 3.11 College-Branded Experience
- White-label: college logo, accent color, custom welcome message
- Custom subdomain: `sjce.applyx.in`, `rvce.applyx.in`
- Branded email templates for student invites
- College-specific resume templates (with college header/logo)

---

### Phase 4 — Monetization Model

#### 3.12 Institutional Pricing

| Tier | Students | Price | Includes |
|------|----------|-------|----------|
| **Starter** | Up to 100 | ₹15,000/year | Resume builder, ATS scoring, 1 mock interview/student |
| **Growth** | Up to 500 | ₹50,000/year | + Placement drives, admin dashboard, 3 interviews/student |
| **Enterprise** | Unlimited | ₹1,50,000/year | + Recruiter portal, white-label, unlimited interviews, API access |
| **Pilot** | 50 students | **Free (3 months)** | Full Growth features — conversion hook |

- Per-student add-on pricing: ₹200-500/student/year for colleges that exceed tier limits
- Credits pooled at institution level (admin allocates to departments/batches)
- Annual billing with quarterly payment option

---

## 4. Minimum Viable Demo for First Pitch

To pitch convincingly, we need **only these working**:

1. ✅ Resume Builder + ATS Scoring (already live)
2. ✅ AI Mock Interview with feedback report (just fixed)
3. 🔨 College Admin Dashboard with sample data (build a prototype with hardcoded stats)
4. 🔨 Bulk CSV upload for students (simple form → table preview)
5. 🔨 Student Readiness heatmap (aggregate existing user data)

Everything else can be shown as wireframes in the pitch deck and promised as roadmap.

---

## 5. Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Institution model + multi-tenant | 3 days | Foundation for everything |
| P0 | College admin dashboard (prototype) | 2 days | Key pitch demo |
| P0 | Bulk student CSV upload | 1 day | Shows scalability |
| P1 | Student readiness view | 2 days | Core value prop |
| P1 | Placement drive CRUD | 3 days | Differentiator |
| P2 | Leaderboard + gamification | 2 days | Drives adoption |
| P2 | Skills gap analysis | 2 days | Curriculum alignment pitch |
| P3 | Recruiter portal | 5 days | Enterprise feature |
| P3 | White-label / branding | 3 days | Premium differentiator |
| P3 | Alumni tracking | 2 days | Accreditation value |

**Total MVP (P0 + P1): ~11 days of focused development**

---

## 6. Competitive Landscape

| Competitor | Weakness ApplyX Exploits |
|------------|--------------------------|
| Superset | No AI resume builder, no voice mock interviews |
| LetsIntern | Job board only, no preparation tools |
| Internshala | No college admin dashboard, no placement tracking |
| PrepInsta | Interview prep only, no resume tools |
| AmbitionBox | Reviews only, no student preparation |

**ApplyX's moat**: End-to-end preparation (resume → practice → apply → track) with real-time college-level analytics. No competitor offers AI voice mock interviews + ATS scoring + placement dashboard in one platform.
