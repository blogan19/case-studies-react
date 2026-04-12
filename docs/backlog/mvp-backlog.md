# Case Studies MVP Backlog

This backlog is written so it can be copied into GitHub Issues, a GitHub Project, or Azure DevOps work items.

## Milestone 1: Reviewable MVP Hardening

### Epic: Core Stability

#### Issue: Add API integration smoke tests
- Goal: verify auth, case create, case publish, session start, and session submit flows
- Acceptance criteria:
  - API smoke script runs locally against seeded database
  - Fails fast if core routes regress
  - Documented in README

#### Issue: Add frontend loading and empty states polish
- Goal: improve reviewer experience during local testing
- Acceptance criteria:
  - Dashboard cards show clear loading states
  - Empty libraries and analytics states are explicit
  - Save/publish actions give success feedback

#### Issue: Add error boundaries and request retry messaging
- Goal: make the MVP more review-safe when backend is unavailable
- Acceptance criteria:
  - Major dashboard areas fail gracefully
  - Network failures show actionable messages

### Epic: Case Authoring Improvements

#### Issue: Add case metadata fields
- Goal: support title, specialty, learning objectives, difficulty, and duration
- Acceptance criteria:
  - Educator can edit these fields in builder
  - Fields are stored in database
  - Student player can display selected metadata

#### Issue: Add duplicate case from educator dashboard action confirmation
- Goal: make cloning clearer for reviewers and lecturers
- Acceptance criteria:
  - Clone creates a visible copy
  - New draft title is clearly marked as copied

#### Issue: Add case status filtering in lecturer dashboard
- Goal: support draft, published, archived workflows
- Acceptance criteria:
  - Lecturer can filter by status
  - Archived cases are separated from active editing view

### Epic: Student Experience Improvements

#### Issue: Add submitted case review mode
- Goal: let students review submitted answers and feedback after completion
- Acceptance criteria:
  - Completed sessions reopen in read-only review mode
  - Student sees submitted answers and score summary

#### Issue: Add per-question explanation display after submission
- Goal: make the assessment flow more educational
- Acceptance criteria:
  - Objective questions show explanation text after submission when available
  - Non-objective questions remain informational only

## Milestone 2: Institutional MVP

### Epic: Multi-User Teaching Workflow

#### Issue: Add proper live session lecturer controls
- Goal: move from payload broadcast to lecturer-controlled progression
- Acceptance criteria:
  - Lecturer can advance session steps
  - Student view syncs to active step
  - Session state is persisted

#### Issue: Add student submission capture for live sessions
- Goal: support classroom polling and teaching analytics
- Acceptance criteria:
  - Students can submit answers in live mode
  - Lecturer sees aggregate counts
  - Results can be revealed live

#### Issue: Add lecturer projector mode
- Goal: support classroom delivery
- Acceptance criteria:
  - Large-format live response view
  - Clean step navigation UI

### Epic: Educational Simulation

#### Issue: Add allergy rule checks in prescribing workflow
- Goal: surface teaching alerts in simulation mode
- Acceptance criteria:
  - Alert appears when prescribed drug matches listed allergy
  - Alert text is clearly educational and non-clinical

#### Issue: Add local interaction rule list
- Goal: provide lightweight configurable warnings
- Acceptance criteria:
  - Admin or educator can manage a small interaction pair list
  - Warning appears when matching pair is prescribed

#### Issue: Add medication review task block
- Goal: support deprescribing and review cases
- Acceptance criteria:
  - Lecturer can add review tasks to a case
  - Student can continue/stop/reduce/query and document reason

## Milestone 3: Platform Integration

### Epic: AUXTECHNA Module Alignment

#### Issue: Add tenant-aware schema design
- Goal: align future architecture with AUXTECHNA multi-tenant model
- Acceptance criteria:
  - All core entities have tenant-aware design notes
  - Migration plan is documented before implementation

#### Issue: Replace standalone auth with platform auth integration plan
- Goal: avoid duplicate auth models long term
- Acceptance criteria:
  - Mapping defined for educator/student/admin roles
  - Existing local auth retained only for MVP/testing

#### Issue: Define module access and settings model for Case Studies
- Goal: match PGD/Homecare module architecture
- Acceptance criteria:
  - Case Studies module access rules documented
  - Module settings separated from site-wide settings

## Milestone 4: Deferred / Phase 2+

### Epic: Advanced Teaching Features
- Pharmacist verification workspace
- Infusion prescribing model
- Simulate 5 administrations action
- Auto-generate patient and scenario sections
- Reusable template library
- Branching logic

### Epic: Monetisation
- Free vs premium case gating
- Subscription status model
- Institutional premium override
- Paywall events and upgrade analytics

## Recommended GitHub Labels
- `mvp`
- `review-blocker`
- `educator-flow`
- `student-flow`
- `live-mode`
- `analytics`
- `simulation`
- `platform-integration`
- `deferred`
- `nice-to-have`

## Recommended First GitHub Milestone
- `MVP Review Build`

Include these issues in that first milestone:
- Add API integration smoke tests
- Add frontend loading and empty states polish
- Add submitted case review mode
- Add per-question explanation display after submission
- Add case metadata fields
- Add proper live session lecturer controls
