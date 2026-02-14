# ApplyX — Freemium License Model Plan

> **Goal**: Every signup gets a taste of the full platform — 1 resume, 1 analysis, 1 mock interview — then hits a soft paywall encouraging upgrade. Job board remains unrestricted.

---

## 1. Current State (What Exists)

### Backend Models Already Built
- **`Subscription` model** (`backend/app/models/subscription.py`)
  - Plans: `FREE`, `BASIC` (₹99/mo), `PRO` (₹499/mo), `PRO_PLUS` (₹5,489/mo)
  - Fields: `resume_edits_used`, `resume_edits_limit`, `interviews_used`, `interviews_limit`
  - Methods: `can_use_resume_edit()`, `can_use_interview()`, `use_resume_edit()`, `use_interview()`
- **`PLAN_LIMITS` config**: `FREE = {resume_edits: 2, interviews: 0}`
- **`PaywallGuardMiddleware`** (`backend/app/middleware/payment_security.py`)
  - Protects `/api/v1/interview/start` (requires `basic+`)
  - Usage-limits `/api/v1/resumes/analyze` (resume_edits) and `/api/v1/interview/start` (interviews)
- **`UserCredits` model** — daily credits system (3 free / 20 premium) for resume customization

### What's NOT Enforced Yet
- Interview start currently requires `basic+` plan — **blocks free users entirely** (should allow 1)
- Resume upload/analysis allows 2 edits for free but no upgrade popup after limit hit
- No post-download upgrade prompt
- No frontend awareness of remaining limits (no "1 of 1 used" indicator)
- Subscription middleware is registered but may not be active in production

---

## 2. New Free Tier Limits

| Feature | Free Tier | Behavior When Exhausted |
|---------|-----------|------------------------|
| **Resume Creation/Edit** | 1 total | Block + show upgrade modal |
| **Resume Analysis (ATS)** | 1 total | Block + show upgrade modal |
| **Resume Download** | Unlimited (for the 1 resume) | After download → show upgrade popup |
| **Mock Interview** | 1 total | Block + show upgrade modal |
| **Job Board (Search/Apply)** | **Unlimited** | No restriction |
| **Application Tracking** | **Unlimited** | No restriction |
| **Job Matching** | **Unlimited** | No restriction |

---

## 3. Implementation Plan

### 3.1 Backend Changes

#### A. Update `PLAN_LIMITS` in `subscription.py`
```python
PLAN_LIMITS = {
    SubscriptionPlan.FREE: {
        "resume_edits": 1,      # Was 2, now 1
        "interviews": 1,        # Was 0, now 1
        "resume_analyses": 1,   # NEW — separate from edits
    },
    SubscriptionPlan.BASIC: {
        "resume_edits": 10,
        "interviews": 3,
        "resume_analyses": 10,
    },
    SubscriptionPlan.PRO: {
        "resume_edits": -1,
        "interviews": 10,
        "resume_analyses": -1,
    },
    SubscriptionPlan.PRO_PLUS: {
        "resume_edits": -1,
        "interviews": -1,
        "resume_analyses": -1,
    },
}
```

#### B. Add `resume_analyses_used` / `resume_analyses_limit` to `Subscription` model
- New columns: `resume_analyses_used` (default 0), `resume_analyses_limit` (default 1)
- New methods: `can_use_analysis()`, `use_analysis()`
- Alembic migration to add columns

#### C. Update `PaywallGuardMiddleware`
- Remove the plan-gate on `/api/v1/interview/start` — free users CAN do 1 interview
- Change from `["basic", "pro", "pro_plus"]` to allowing free tier (just check usage limit)
- Add `/api/v1/livekit/start-interview` to usage-limited endpoints (since we now use LiveKit)
- Add `/api/v1/resumes/upload` to usage-limited endpoint for `resume_edits`
- Add `/api/v1/ats/score` to usage-limited endpoint for `resume_analyses`

```python
PROTECTED_ENDPOINTS = {
    # Remove hard plan-gate — free users get 1 interview
}

USAGE_LIMITED_ENDPOINTS = {
    "/api/v1/resumes/upload": "resume_edits",
    "/api/v1/resumes/analyze": "resume_analyses",
    "/api/v1/ats/score": "resume_analyses",
    "/api/v1/ats/analyze": "resume_analyses",
    "/api/v1/interview/start": "interviews",
    "/api/v1/livekit/start-interview": "interviews",
    # Job board endpoints NOT listed — unrestricted
}
```

#### D. New API endpoint: `GET /api/v1/subscription/usage`
Return current usage + limits so frontend can display remaining credits:
```json
{
    "plan": "free",
    "resume_edits": { "used": 1, "limit": 1 },
    "resume_analyses": { "used": 0, "limit": 1 },
    "interviews": { "used": 0, "limit": 1 },
    "is_limit_reached": {
        "resume_edits": true,
        "resume_analyses": false,
        "interviews": false
    }
}
```

#### E. Ensure subscription auto-created on signup
- When a new user registers (or first authenticates via Supabase), auto-create a `Subscription` record with `plan=FREE` and correct limits
- Check `User.from_supabase_auth()` — ensure it creates subscription if missing

---

### 3.2 Frontend Changes

#### A. Usage Context/Hook — `useSubscription()`
New hook: `frontend/src/hooks/useSubscription.ts`
- Calls `GET /api/v1/subscription/usage` on mount
- Exposes: `plan`, `usage`, `isLimitReached`, `canUseResume`, `canUseInterview`, `canUseAnalysis`
- Provides `showUpgradeModal()` helper

#### B. Upgrade Modal Component — `UpgradeModal.tsx`
New component: `frontend/src/components/shared/UpgradeModal.tsx`
- Premium glassmorphism design matching the interview UI overhaul
- Shows which limit was hit: "You've used your free resume" / "You've used your free interview"
- Plan comparison table with current plan highlighted
- CTA buttons: "Upgrade to Basic — ₹99/mo" / "Upgrade to Pro — ₹499/mo"
- "Maybe later" dismiss button
- Reusable across all feature pages

#### C. Post-Download Upgrade Popup
In these files:
- `frontend/src/pages/LivePdfEditor.tsx` — after `downloadPdf()` call
- `frontend/src/pages/ATSTemplates.tsx` — after download
- `frontend/src/components/jobs/ResumeCustomizer.tsx` — after `handleDownload()`

After the download completes, if `plan === 'free'`:
```tsx
if (subscription.plan === 'free') {
    showUpgradeModal({
        trigger: 'post_download',
        message: 'Your resume is ready! Want AI-powered improvements and unlimited edits?',
    });
}
```

#### D. Guard on Resume Builder Page
In `frontend/src/pages/ResumeBuilder.tsx`:
- Before upload, check `canUseResume` — if false, show `UpgradeModal` immediately
- Show remaining count: "1 of 1 resume used" banner at top

In `frontend/src/pages/ResumeEditor.tsx` / `LivePdfEditor.tsx`:
- Allow editing the existing resume (editing ≠ creating new)
- Block creating a NEW resume if limit reached
- Distinguish: "edit existing" (free) vs "create new" (counts toward limit)

#### E. Guard on Resume Analysis
In `frontend/src/pages/ResumeAnalysis.tsx`:
- Before triggering analysis, check `canUseAnalysis`
- If limit reached → show upgrade modal instead of running analysis

#### F. Guard on Mock Interview
In `frontend/src/pages/InterviewSetup.tsx`:
- Before navigating to `/interview/room`, check `canUseInterview`
- If limit reached → show upgrade modal with interview-specific messaging

#### G. Usage Indicator in Dashboard
In `frontend/src/pages/Dashboard.tsx`:
- Add a usage summary card showing:
  - "Resumes: 0/1 used" with progress bar
  - "Analyses: 0/1 used" with progress bar
  - "Interviews: 0/1 used" with progress bar
  - "Upgrade" button when any limit is approaching

#### H. Job Board — No Changes
These pages remain completely unrestricted:
- `/jobs`, `/job-search` — no guards
- `/applications`, `/job-board` — no guards
- Job matching API — no usage limits

---

## 4. User Journey (Free Tier)

```
Sign Up
  └→ Auto-create FREE subscription (1 resume, 1 analysis, 1 interview)

Upload Resume
  └→ Backend: use_resume_edit() → resume_edits_used = 1
  └→ Resume uploaded + basic parsing

Analyze Resume (ATS Score)
  └→ Backend: use_analysis() → resume_analyses_used = 1
  └→ Full ATS analysis with scores, keywords, suggestions

Download Resume
  └→ Download works (no limit on downloads for existing resume)
  └→ Post-download popup: "Want more? Upgrade for unlimited resumes + AI optimization"

Try to Upload 2nd Resume
  └→ Backend returns 402: "Resume limit reached"
  └→ Frontend shows UpgradeModal: "Upgrade to create more resumes"

Take Mock Interview
  └→ Backend: use_interview() → interviews_used = 1
  └→ Full AI voice interview + feedback report

Try 2nd Interview
  └→ Backend returns 402: "Interview limit reached"
  └→ Frontend shows UpgradeModal: "Upgrade for more practice sessions"

Browse & Apply to Jobs
  └→ Always works, no limits
  └→ Application tracking, job matching — all free
```

---

## 5. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `backend/alembic/versions/xxx_add_analyses_tracking.py` | Migration: add `resume_analyses_used`, `resume_analyses_limit` columns |
| `frontend/src/hooks/useSubscription.ts` | Hook for checking usage limits |
| `frontend/src/components/shared/UpgradeModal.tsx` | Reusable upgrade prompt modal |

### Modified Files — Backend
| File | Change |
|------|--------|
| `backend/app/models/subscription.py` | Update `PLAN_LIMITS`, add analysis columns + methods |
| `backend/app/middleware/payment_security.py` | Update protected/usage-limited endpoints |
| `backend/app/api/routes/payment.py` | Add `GET /subscription/usage` endpoint |
| `backend/app/models/user.py` | Ensure `from_supabase_auth()` auto-creates FREE subscription |

### Modified Files — Frontend
| File | Change |
|------|--------|
| `frontend/src/pages/ResumeBuilder.tsx` | Check limit before upload, show modal |
| `frontend/src/pages/ResumeAnalysis.tsx` | Check limit before analysis |
| `frontend/src/pages/InterviewSetup.tsx` | Check limit before starting interview |
| `frontend/src/pages/LivePdfEditor.tsx` | Post-download upgrade popup |
| `frontend/src/pages/ATSTemplates.tsx` | Post-download upgrade popup |
| `frontend/src/pages/Dashboard.tsx` | Usage summary card |
| `frontend/src/components/interview/InterviewRoom.tsx` | Handle 402 from start-interview |
| `frontend/src/components/jobs/ResumeCustomizer.tsx` | Post-download upgrade popup |

---

## 6. Edge Cases to Handle

| Scenario | Behavior |
|----------|----------|
| User deletes their only resume | Does NOT refund the usage — still counts as 1/1 used |
| User edits existing resume | Free — only creating NEW resumes costs a credit |
| User re-analyzes same resume | Costs another analysis credit (each analysis = 1 credit) |
| User starts interview but disconnects | Counts as used if the room was created |
| User signed up before freemium launch | Existing FREE users keep their current `resume_edits_used` count; new limits applied retroactively |
| Admin/superadmin users | Skip all limits (`is_superadmin = True` bypasses paywall) |
| Subscription expires (paid → free) | Usage resets but new FREE limits apply |

---

## 7. Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Update `PLAN_LIMITS` + add analysis columns to Subscription model | 30 min |
| 2 | Alembic migration | 15 min |
| 3 | Update `PaywallGuardMiddleware` endpoint config | 30 min |
| 4 | Add `/subscription/usage` API endpoint | 30 min |
| 5 | Ensure auto-subscription on signup | 30 min |
| 6 | Create `useSubscription` hook (frontend) | 45 min |
| 7 | Create `UpgradeModal` component (frontend) | 1 hour |
| 8 | Add guards to ResumeBuilder, InterviewSetup, Analysis pages | 1 hour |
| 9 | Add post-download popups | 30 min |
| 10 | Add usage card to Dashboard | 30 min |
| 11 | Test full free-user journey end-to-end | 1 hour |

**Total estimated effort: ~7 hours**

---

## 8. Upgrade Path (Paid Plans)

For reference, when users hit the paywall:

| Plan | Monthly | Resumes | Analyses | Interviews | Extras |
|------|---------|---------|----------|------------|--------|
| **Free** | ₹0 | 1 | 1 | 1 | Job board unlimited |
| **Basic** | ₹99 | 10 | 10 | 3 | Premium templates |
| **Pro** | ₹499 | Unlimited | Unlimited | 10 | AI optimization, cover letters |
| **Pro+** | ₹5,489 | Unlimited | Unlimited | Unlimited | Priority support, job guarantee |

Razorpay integration is already built (`backend/app/services/razorpay_service.py`) — just needs activation.
