# AUXTECHNA Case Studies MVP

A local-first MVP for teaching case studies, staged learning scenarios, and EPMA-style prescribing simulation.

This repository is intended for local review and colleague handover before any production deployment. It contains a React frontend, an Express/PostgreSQL API, database schema, seed data, and supporting documentation.

## Current Scope

This build supports:

- Student, facilitator, and facilitator-admin accounts
- Case study authoring, preview/testing, draft save, publishing, cloning, archiving, and sharing
- Self-paced student case studies with save-progress and submit flows
- Staged case studies that can progress after question answers
- Live classroom sessions with join codes and realtime response summaries
- Facilitator live controls for stages, questions, answer reveals, and ending sessions
- Facilitator analytics and individual attempt review/reset
- EPMA-style patient record, allergy, medication history, VTE, task, and prescription chart workflows
- Expanded seeded drug library for prescribing
- Drug library/reference-data management
- Local handover documentation for setup and architecture

## Technology Stack

- React 18 with Create React App
- React Bootstrap, Bootstrap 5, Bootstrap Icons
- Express 5 API
- PostgreSQL via `pg`
- JWT authentication with `jsonwebtoken`
- Password hashing with `bcryptjs`
- Server-sent events for live classroom updates
- Plain SQL schema in `server/db/001_init.sql`

There is no ORM in this MVP. Case study and session state is stored heavily as JSONB snapshots.

## Key Documentation

- [Application structure and technology handover](docs/architecture/app-structure-and-tech-handover.md)
- [Accessing the application after setup](docs/architecture/access-after-setup-summary.md)
- [AUXTECHNA integration roadmap](docs/architecture/auxtechna-integration-roadmap.md)
- [MVP backlog](docs/backlog/mvp-backlog.md)
- [GitHub review checklist](docs/backlog/github-review-checklist.md)

## Demo Accounts

When the API starts against an empty database, it seeds:

- Facilitator admin: `admin@casestudy.local` / `Admin123!`
- Facilitator: `demo@casestudy.local` / `Demo123!`
- Student: `student@casestudy.local` / `Student123!`

The API also seeds one demo published case study and one active live classroom session. The live session code is printed in the API terminal.

These credentials are for local review only. Change or remove them before using the application on a shared server.

## Seeded Data

On first startup against an empty database, the API creates the schema and seeds:

- Demo users listed above
- One demo case study from `src/case_study.json`
- One active live classroom session for the demo case
- Drug library from `server/seed/drug-library.seed.csv`
- Routes, frequencies, units, forms, indications, allergy reactions, common conditions, order sets, and EPMA reference data
- Demo test patients for each user

The expanded drug list is committed as `server/seed/drug-library.seed.csv`.

## Local Setup

### 1. Clone and open the project

```powershell
git clone https://github.com/blogan19/case-studies-react.git
cd case-studies-react
```

### 2. Start PostgreSQL

Option A: use Docker:

```powershell
docker compose up -d
```

This starts Postgres with:

- database: `case_studies_react`
- username: `postgres`
- password: `postgres`

Option B: create the database manually:

```powershell
psql -U postgres -c "CREATE DATABASE case_studies_react;"
```

### 3. Create the environment file

```powershell
Copy-Item .env.example .env
```

Default `.env.example` contents:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/case_studies_react
JWT_SECRET=change-this-in-production
```

Update `DATABASE_URL` if your PostgreSQL host, username, password, port, or database name differs. Change `JWT_SECRET` for anything beyond local testing.

### 4. Install packages

```powershell
npm install
```

### 5. Start the API

```powershell
npm run server
```

The API runs on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

Expected response:

```json
{ "ok": true }
```

### 6. Start the frontend

In a second terminal:

```powershell
npm start
```

Open:

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

`npm run build` currently passes, but Create React App may emit existing warnings about Browserslist/autoprefixer and an undeclared Babel plugin dependency.

## Review Flow

### Facilitator/Admin

1. Sign in as `admin@casestudy.local` / `Admin123!`.
2. Open the facilitator areas.
3. Create or edit a case study.
4. Test the case study before publishing.
5. Publish as a normal case study or start a live classroom.
6. Share with students or copy the student link.
7. Review attempts, scores, live responses, and access history.

### Student

1. Sign in as `student@casestudy.local` / `Student123!`.
2. Open the student dashboard.
3. Start a published case study.
4. Answer and confirm questions.
5. Save progress or submit the case.
6. Reopen saved progress to continue unfinished questions.

### Live Classroom

1. Start a live classroom as a facilitator.
2. Copy the live session code.
3. Join from a second browser/incognito window as a student.
4. Submit answers from the student live view.
5. Use facilitator controls to move questions/stages and reveal answers.
6. End the live session from the live teaching view or the case library.

### Staged Case Studies

Staged case studies can be used in two ways:

- Normal self-paced case study: later stages must be triggered by students answering configured questions.
- Live classroom: stages can be triggered by question answers or manually advanced by the facilitator.

Manual stage progression is live-classroom only because a self-paced student has no facilitator control to move the stage forward.

## Repository Structure

```text
src/
  App.jsx
  Case_study_display.jsx
  components/
  lib/
server/
  index.js
  auth.js
  db.js
  config.js
  db/001_init.sql
  seed/drug-library.seed.csv
scripts/
docs/
```

Important files:

- [src/App.jsx](src/App.jsx): main frontend app shell and role-based view switching
- [src/lib/caseStudy.js](src/lib/caseStudy.js): case normalisation, staging, validation, and grading helpers
- [src/lib/api.js](src/lib/api.js): frontend API client
- [src/Case_study_display.jsx](src/Case_study_display.jsx): patient/case display surface
- [src/components/player/CaseSessionPlayer.jsx](src/components/player/CaseSessionPlayer.jsx): self-paced and facilitator-preview case player
- [src/components/player/LiveSessionView.jsx](src/components/player/LiveSessionView.jsx): student live-session view
- [src/components/dashboard/FacilitatorCaseAuthoringWorkspace.jsx](src/components/dashboard/FacilitatorCaseAuthoringWorkspace.jsx): case builder workspace
- [src/components/dashboard/FacilitatorCaseLibrary.jsx](src/components/dashboard/FacilitatorCaseLibrary.jsx): view/share/publish case library
- [server/index.js](server/index.js): main API server, routes, seeding, and live session events
- [server/db/001_init.sql](server/db/001_init.sql): schema setup
- [server/seed/drug-library.seed.csv](server/seed/drug-library.seed.csv): seeded drug library

## Security Notes Before Shared Deployment

This MVP is suitable for local review, but before running it on a real shared server:

- Change `JWT_SECRET`
- Replace or remove seeded demo credentials
- Do not keep `Admin123!`, `Demo123!`, or `Student123!` as active credentials
- Consider replacing hardcoded first-admin seeding with environment-driven setup
- Review whether real patient data is permitted; the app is designed for simulated/educational data
- Configure HTTPS, secure hosting, backups, and proper database access controls

## Known Limitations

- Multi-tenancy is not implemented yet
- `server/index.js` is large and should eventually be split into route/service modules
- Case data relies heavily on JSONB snapshots, so changes need careful normalisation
- Rules engine is still minimal
- Pharmacist verification and infusion simulation are not fully implemented
- Payment/freemium features are not implemented
- This remains an MVP and should be reviewed before production use

