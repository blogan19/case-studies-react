# AUXTECHNA Case Studies MVP

A local-first MVP for the university teaching and prescribing platform. This repo is intended to be reviewed locally before deployment and shared with colleagues through GitHub.

## Current MVP scope

This build now supports:

- Educator and student accounts
- Educator dashboard
- Case builder and preview
- Save draft / publish / clone / archive case studies
- Published case library for students
- Student self-paced case sessions
- Save progress and submit for scoring
- Submitted answer review with explanations where available
- Basic lecturer analytics for a selected case
- Live teaching sessions via join code and realtime case updates
- Lecturer-controlled live progression and projector view
- Live student answer submission with aggregate classroom response summaries
- Simplified ePMA-style medication chart and patient case display
- CSV-backed drug library import for prescribing
- API smoke test script for quick environment validation

## Review documents

- Backlog: [docs/backlog/mvp-backlog.md](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/docs/backlog/mvp-backlog.md)
- GitHub review checklist: [docs/backlog/github-review-checklist.md](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/docs/backlog/github-review-checklist.md)
- AUXTECHNA integration roadmap: [docs/architecture/auxtechna-integration-roadmap.md](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/docs/architecture/auxtechna-integration-roadmap.md)

## Demo accounts

When the API starts against an empty database it seeds:

- Educator: `demo@casestudy.local` / `Demo123!`
- Student: `student@casestudy.local` / `Student123!`

The API also seeds one published case and prints a live session code in the terminal.

## Local setup

### 1. Open the project

```powershell
cd "C:\Users\Ben\OneDrive\Documents\codex\case-studies-react"
```

### 2. Database options

Option A: create the PostgreSQL database manually

```powershell
psql -U postgres -c "CREATE DATABASE case_studies_react;"
```

If your local PostgreSQL username is not `postgres`, replace it.

Option B: run PostgreSQL with Docker

```powershell
docker compose up -d
```

This starts a local Postgres instance with:

- database: `case_studies_react`
- username: `postgres`
- password: `postgres`

### 3. Create the environment file

```powershell
Copy-Item .env.example .env
```

### 4. Check `.env`

Default contents:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/case_studies_react
JWT_SECRET=change-this-in-production
```

Update `DATABASE_URL` if your local PostgreSQL password or username is different.

### 5. Install packages

```powershell
npm install
```

### 6. Start the API

```powershell
npm run server
```

### 7. Start the frontend in a second terminal

```powershell
npm start
```

### 8. Run the smoke test (optional but recommended)

```powershell
npm run smoke
```

### 9. Open the app

[http://localhost:3000](http://localhost:3000)

## Review flow

### Educator review

1. Sign in as the educator demo user
2. Open the educator dashboard
3. Edit the seeded case or create a new draft
4. Save the draft and confirm the success banner
5. Publish the case
6. Confirm the live code appears in the navbar
7. Clone or archive a case from the dashboard
8. Review the analytics block after student submissions

### Student review

1. Sign in as the student demo user
2. Open the student dashboard
3. Start a case from the library
4. Answer questions
5. Save progress and confirm the success banner
6. Submit the case
7. Review score and answer explanations
8. Return to dashboard and verify the session score/status

### Live teaching review

1. Publish a case as the educator
2. Copy the live session code
3. Open a second browser or incognito window
4. Join the live session with the code
5. Use `Projector view` in the navbar to open the lecturer-facing teaching screen
6. Move between questions with `Previous` and `Next`
7. Submit an answer from the student live screen
8. Confirm the lecturer sees live counts and distribution bars update
9. Reveal the answer and confirm correct-answer highlighting appears

### Drug library review

1. Sign in as the educator demo user
2. Open the educator dashboard
3. In the `Drug Library` card, upload or paste CSV content with columns `drug_name,strength,unit,form,default_route`
4. Import the CSV and confirm the library summary updates
5. Open `Add prescription`
6. Confirm the new drugs are available in the picker and the default route prefills where present

## MVP architecture in this repo

### Frontend

- [src/App.jsx](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/src/App.jsx): app shell and role-based flows
- [src/components/dashboard/LecturerDashboard.jsx](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/src/components/dashboard/LecturerDashboard.jsx): educator dashboard
- [src/components/dashboard/StudentDashboard.jsx](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/src/components/dashboard/StudentDashboard.jsx): student dashboard
- [src/components/player/CaseSessionPlayer.jsx](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/src/components/player/CaseSessionPlayer.jsx): self-paced player and feedback review
- [src/Case_study_edit.jsx](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/src/Case_study_edit.jsx): builder workspace

### Backend

- [server/index.js](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/server/index.js): auth, case, session, live, analytics API
- [server/db/001_init.sql](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/server/db/001_init.sql): local MVP schema
- [docker-compose.yml](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/docker-compose.yml): optional local Postgres setup
- [scripts/smoke-test.js](/C:/Users/Ben/OneDrive/Documents/codex/case-studies-react/scripts/smoke-test.js): API smoke test

## Verified locally

- `npm run build` passes
- `node --check server/index.js` passes

## Known limitations

- Multi-tenancy is not implemented yet in this repo
- Platform integration with the main AUXTECHNA architecture is still a later step
- Rules engine is still minimal
- Pharmacist verification and infusion simulation are not yet included in this MVP
- Payment/freemium features are not yet implemented

## Suggested GitHub workflow

1. Create a new private GitHub repo
2. Push this code to the repo
3. Add your colleague as a collaborator
4. Ask them to review:
   - UX flow
   - data model direction
   - case authoring workflow
   - student session flow
   - live teaching usefulness
5. Decide after review whether to:
   - keep as a separate service, or
   - fold into the main platform as a Case Studies module
