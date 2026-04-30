# Accessing The Application After Setup

This summary explains how to access the application after it has been installed, configured, and started on a new machine or server.

## 1. Start The Database

The app needs PostgreSQL running before the API can start.

For local Docker setup:

```powershell
docker compose up -d
```

This creates a local PostgreSQL database using the values in `docker-compose.yml`.

## 2. Check The Environment File

Create `.env` from `.env.example` if it does not already exist:

```powershell
Copy-Item .env.example .env
```

The important values are:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/case_studies_react
JWT_SECRET=change-this-in-production
```

Update `DATABASE_URL` if the database host, username, password, port, or database name is different.

For anything beyond local testing, change `JWT_SECRET`.

## 3. Install Dependencies

From the project root:

```powershell
npm install
```

## 4. Start The API

In one terminal:

```powershell
npm run server
```

The API normally runs on:

```text
http://localhost:4000
```

On first startup against an empty database, the API creates the database tables and seeds the initial data.

## 5. Start The Frontend

In a second terminal:

```powershell
npm start
```

The frontend normally opens at:

```text
http://localhost:3000
```

If it does not open automatically, browse to that URL manually.

## 6. First Login Details

When the API starts against an empty database, it creates these demo accounts:

```text
Facilitator admin
Email: admin@casestudy.local
Password: Admin123!
```

```text
Facilitator
Email: demo@casestudy.local
Password: Demo123!
```

```text
Student
Email: student@casestudy.local
Password: Student123!
```

Use the facilitator admin account first:

```text
admin@casestudy.local
Admin123!
```

That account can access the admin/facilitator areas and approve educator accounts.

## 7. What Is Seeded On First Launch

The first launch against an empty database seeds:

- The three demo users above.
- One demo published case study.
- One active live session for that demo case.
- A generated live session code, printed in the API terminal.
- The drug library from `server/seed/drug-library.seed.csv`.
- Routes, frequencies, units, forms, indications, allergy reactions, common conditions, order sets, and EPMA reference data.
- Demo test patients for each user.

## 8. Creating Real Users

Students can register and sign in immediately.

Educators can register, but their accounts are created as pending approval. A facilitator admin must approve them before they can log in.

Admin accounts are not created through normal registration. The first admin currently comes from the startup seed:

```text
admin@casestudy.local / Admin123!
```

## 9. Important Security Note

The seeded demo credentials are suitable for local review only.

Before using the app on a real shared server:

- Change `JWT_SECRET`.
- Replace or remove the demo accounts.
- Change the seeded admin password immediately after first login, or replace the current hardcoded first-admin seed with environment-driven setup.
- Do not leave `Admin123!`, `Demo123!`, or `Student123!` as real access credentials.

## 10. Quick Health Check

To confirm the API is alive:

```text
http://localhost:4000/api/health
```

Expected response:

```json
{ "ok": true }
```

To confirm the app is usable, open:

```text
http://localhost:3000
```

Then sign in as:

```text
admin@casestudy.local / Admin123!
```

