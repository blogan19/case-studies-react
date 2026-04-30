# Case Studies App: Structure And Technology Handover

This document is intended as a quick technical briefing for another developer or an AI coding assistant such as Claude. It explains what this application is, how it is structured, what technologies it uses, and where the important behaviours live.

## High-Level Purpose

This is a teaching and prescribing simulation app for case studies and EPMA-style medication chart workflows.

The main user roles are:

- `student`: can access published/self-paced case studies, join live sessions, answer questions, and save/submit progress.
- `educator`: can create/edit/publish case studies, run live sessions, review attempts, and use facilitator tools.
- `educator_admin`: has educator access plus admin-only management features such as user/account administration and drug-library/reference-data controls.

Core workflows:

- Build case studies with patient details, notes, observations, bloods, microbiology, imaging, prescriptions, allergies, and questions.
- Publish case studies for self-paced student attempts.
- Present case studies as live classroom sessions using a join code.
- Create staged case studies where later content is layered onto earlier stages manually or after a question is answered.
- Let students interact with an EPMA-style prescription chart within case studies.
- Review student answers and scores.

## Technology Stack

Frontend:

- React 18
- Create React App / `react-scripts`
- React Bootstrap and Bootstrap 5
- Bootstrap Icons
- Chart.js / `react-chartjs-2`
- Plain component state; no Redux or external global state library

Backend:

- Node.js
- Express 5
- PostgreSQL via `pg`
- JWT authentication via `jsonwebtoken`
- Password hashing via `bcryptjs`
- Server-sent events for live-session realtime updates

Database:

- PostgreSQL
- Schema is created/updated from plain SQL in `server/db/001_init.sql`
- The app does not currently use Prisma, Sequelize, or an ORM
- Many case-study and EPMA objects are stored as JSONB snapshots

Local/dev:

- `docker-compose.yml` can start a local PostgreSQL instance
- `.env.example` contains the expected environment variables
- `npm start` runs the frontend
- `npm run server` runs the API
- `npm run build` builds the frontend

## Important Environment Variables

Defined in `.env.example`:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/case_studies_react
JWT_SECRET=change-this-in-production
```

For any shared or production-like server, change `JWT_SECRET` and do not keep default demo credentials as the long-term access method.

## Repository Structure

```text
.
├── public/
├── src/
│   ├── App.jsx
│   ├── Case_study_display.jsx
│   ├── Case_study_edit.jsx
│   ├── case_study.json
│   ├── components/
│   └── lib/
├── server/
│   ├── auth.js
│   ├── config.js
│   ├── db.js
│   ├── index.js
│   ├── db/
│   │   └── 001_init.sql
│   └── seed/
│       └── drug-library.seed.csv
├── scripts/
├── docs/
├── package.json
├── docker-compose.yml
└── .env.example
```

## Frontend Entry Points

`src/App.jsx`

The main app shell. It owns most top-level state and routing-like view switching. It decides whether the user is in public, student, educator, live-session, case-player, or authoring views.

Key responsibilities:

- Login/register/session state
- Role-based screens
- Loading educator and student data
- Starting/resuming/submitting case sessions
- Joining live sessions
- Facilitator live controls
- Opening facilitator preview/test mode

`src/Case_study_display.jsx`

The main patient/case display component. It renders the patient record, prescription chart, allergies, notes, observations, investigations, microbiology, and related case content. It is used in both EPMA-like workflows and case-study player views.

`src/Case_study_edit.jsx`

Older/central case-study editing surface. Some current authoring UI is also split into dashboard components.

`src/lib/caseStudy.js`

Shared frontend case-study helpers:

- Normalising case-study data
- Creating staged case-study stages
- Applying staged patches
- Deciding what stage should be visible
- Advancing stage after a trigger question
- Publish validation checks
- Grading answers

Recent important functions:

- `getLivePresentationCase`
- `getCaseStudyForLiveStage`
- `advanceCaseStudyStageForQuestion`
- `gradeAnswers`

`src/lib/api.js`

Frontend API client wrapper. Most network calls from React go through this file.

## Key Frontend Component Areas

`src/components/dashboard/`

Educator/student dashboards and case-study management UI. Important files include:

- `FacilitatorCaseLibrary.jsx`: facilitator case-study library, publish/share/test actions.
- `FacilitatorCaseAuthoringWorkspace.jsx`: case-study builder workspace.
- `FacilitatorCasePresentation.jsx`: facilitator live-session presentation controls.
- `LecturerLiveView.jsx`: facilitator live response/score view.

`src/components/player/`

Student-facing and facilitator-preview case running UI.

- `CaseSessionPlayer.jsx`: self-paced case-study attempt player and facilitator test player.
- `LiveSessionView.jsx`: student live-session view.

`src/components/patient_records/`

EPMA/patient chart components such as allergy and patient-record editing flows.

`src/components/prescriptions/`

Prescription chart and prescribing-related components.

## Backend Entry Points

`server/index.js`

This is the main API server and currently contains most backend behaviour in one file. It includes:

- Express app setup
- Database initialisation call
- Seeding logic
- Auth endpoints
- Admin endpoints
- Case-study CRUD/publish/share endpoints
- Self-paced case-session endpoints
- Live-session endpoints and server-sent events
- Drug-library/reference-data endpoints
- EPMA/test-patient endpoints

`server/auth.js`

JWT creation and request authentication middleware.

Important behaviours:

- `authenticateRequest` blocks suspended, access-removed, and pending-approval users.
- `optionalAuthenticateRequest` allows guest live-session responses while still attaching a user when a valid token exists.

`server/db.js`

Postgres pool/query helpers.

`server/config.js`

Reads environment variables and provides server config.

`server/db/001_init.sql`

Plain SQL schema. The API runs this on startup. It uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so it behaves like a lightweight migration file.

## Database Model Overview

Major tables:

- `users`: accounts, roles, account status.
- `case_studies`: draft and published case-study JSON.
- `case_study_shares`: facilitator/student sharing.
- `case_study_sets`, `case_study_set_items`, `case_study_set_shares`: grouped case-study libraries.
- `case_sessions`: self-paced student attempts.
- `live_sessions`: active/closed live teaching sessions.
- `live_session_responses`: live answers per participant/question.
- `live_session_participants`: logged-in students who viewed/joined live sessions.
- `student_case_study_favourites`: student favourites.
- `test_patients`: EPMA test-patient records.
- `patient_chart_audit_events`: patient chart access/action audit log.
- `drug_library_items`: available prescribing drug list.
- `route_options`, `frequency_options`, `unit_options`, `form_options`, `indication_options`: prescribing/reference options.
- `allergy_reaction_options`, `critical_medicines`, `controlled_drugs`, `drug_order_sets`: EPMA support data.

Case studies and sessions rely heavily on JSONB snapshots:

- `case_studies.draft_data`
- `case_studies.published_data`
- `case_sessions.case_snapshot`
- `case_sessions.answers`
- `case_sessions.progress`
- `live_sessions.last_payload`

This means many changes are made in JS normalisation/sanitisation code rather than via many relational columns.

## Startup And Seed Behaviour

On API startup, `initializeDatabase()` in `server/index.js` runs.

It does the following:

1. Runs `server/db/001_init.sql`.
2. If the `users` table is empty, creates demo users:
   - `demo@casestudy.local` / `Demo123!` with role `educator`
   - `admin@casestudy.local` / `Admin123!` with role `educator_admin`
   - `student@casestudy.local` / `Student123!` with role `student`
3. If users already exist but no `educator_admin` exists, creates:
   - `admin@casestudy.local` / `Admin123!`
4. Seeds one demo case study from `src/case_study.json`.
5. Seeds one active live session for that demo case when the database is empty.
6. Seeds drug/reference data.
7. Seeds demo test patients for each user.

Drug-library seed source:

- Primary seed: `server/seed/drug-library.seed.csv`
- Fallback seed: `src/components/prescriptions/drugList.json`

The drug CSV is now the main seed and includes the expanded drug list. It is inserted only if `drug_library_items` is empty. A guaranteed Warfarin entry is also ensured.

## First Admin Access

Currently the first facilitator admin account is created automatically on startup:

```text
admin@casestudy.local
Admin123!
```

Normal registration does not create admin accounts. The `/api/auth/register` endpoint only creates:

- active `student` accounts
- `educator` accounts with `pending_approval`

An `educator_admin` must approve educator accounts.

Before deploying beyond local review, replace hardcoded demo admin credentials with environment-driven first-admin setup, or create the first admin via a secure one-off script.

## Case-Study Staging

Staged case studies are stored inside the case-study JSON:

- `isStagedLiveCase`
- `liveStages`
- `currentStageIndex`
- each stage has:
  - `title`
  - `trigger`
  - `patch`

Despite the historic name `liveStages`, staged progression now applies to both:

- live classroom sessions
- normal self-paced case studies

Important shared frontend logic is in `src/lib/caseStudy.js`.

Important server logic is in `server/index.js`:

- `getLivePresentationPayload`
- `advanceCaseStudyStageForQuestion`
- live response endpoint `/api/sessions/:code/responses`
- case-session complete endpoint `/api/case-sessions/:id/complete`

## Live Sessions

Live sessions use server-sent events.

Frontend:

- `createSessionEventSource` in `src/lib/api.js`
- student live view in `src/components/player/LiveSessionView.jsx`
- facilitator controls in `src/components/dashboard/FacilitatorCasePresentation.jsx`

Backend:

- `sessionClients` map in `server/index.js`
- `/api/sessions/:code/events`
- `sendSessionEvent`
- `sendResponseEvent`

Live-session responses are stored in `live_session_responses`. Logged-in student access is tracked in `live_session_participants`.

## Self-Paced Case Attempts

Main endpoints:

- `POST /api/case-studies/:id/start`
- `GET /api/case-sessions/:id`
- `PUT /api/case-sessions/:id`
- `POST /api/case-sessions/:id/complete`

Frontend:

- `CaseSessionPlayer.jsx`
- `handleStartCase`, `handleSaveCaseSession`, `handleSubmitCaseSession` in `src/App.jsx`

Important behaviour:

- Save progress updates only that student's `case_sessions` row.
- Submit case completes that student's attempt.
- Facilitator preview/test mode is local and does not create a student attempt.

## Auth And Account Flow

Registration:

- Students are active immediately.
- Educators are created as `pending_approval`.
- Admins are not created via registration.

Login blocks:

- `pending_approval`
- `suspended`
- `access_removed`

Admin-only operations check `educator_admin` using `hasEducatorAdminAccess`.

Educator-level operations check `educator` or `educator_admin` using `hasEducatorAccess`.

## Running Locally

1. Start Postgres manually or with Docker:

```powershell
docker compose up -d
```

2. Copy environment file:

```powershell
Copy-Item .env.example .env
```

3. Install dependencies:

```powershell
npm install
```

4. Start API:

```powershell
npm run server
```

5. Start frontend:

```powershell
npm start
```

6. Open:

```text
http://localhost:3000
```

## Useful Commands

```powershell
npm run build
node --check server\index.js
npm run smoke
npm run test:frontend -- --runInBand
```

`npm run build` currently passes, but Create React App emits existing warnings about Browserslist/autoprefixer and an undeclared Babel plugin dependency.

## Notes For Future Development

- `server/index.js` is large and would benefit from being split into route modules and services.
- The database schema is plain SQL, not ORM-managed.
- Many objects are JSONB snapshots, so schema evolution needs careful normalisation code.
- Demo credentials should not be used as production credentials.
- First-admin creation should be made environment-driven before real deployment.
- The term `liveStages` remains in code even though staged case studies now apply to self-paced cases too.
- There is no full multi-tenant model yet.
- Be careful not to change EPMA behaviour globally when implementing case-builder-only features.

