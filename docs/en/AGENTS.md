# AI Agents Instructions
This file serves as the entry point for any AI agent working on this codebase.

## Tech Stack
- UI: Vanilla HTML / CSS / JS in `public/`
- API: Vercel serverless Node.js handlers in `api/`
- Shared: `lib/db.js` (pg), `lib/http.js`
- Database: Supabase Postgres (Session pooler)

## Commands
- `npm run init-db`: Migrate/create tables and seed if empty
- `npm run dev`: Run local server on http://localhost:3000
- `npx vercel --prod`: Deploy to Vercel

## Rules & Conventions
1. Schema changes: Edit `scripts/init-db.js`, run `npm run init-db`.
2. API changes: Edit `api/*.js`, keep `lib/http.js` helpers.
3. UI changes: Edit `public/*`.
4. Secrets: `DATABASE_URL` is in `.env` (never commit). Production uses Vercel env variables.
