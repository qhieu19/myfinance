# Architecture & Layout

## Overview
UI (`public/`) calls `/api/*` endpoints. Node handlers use `lib/db.js` (`pg`) to query Supabase Postgres. Locally, `server.js` serves both. On Vercel, `api/` is serverless and `vercel.json` maps static files.

## Folder Layout
- `public/`: UI only (no secrets)
  - `index.html`: Structure + modals
  - `script.js`: State, month nav, CRUD, CSV, paid colors
  - `style.css`: Layout
- `api/`: One file per resource (Vercel entrypoints)
- `lib/`: `db.js` (getPool), `http.js`
- `scripts/init-db.js`: Schema migrate + seed
- `server.js`: Local HTTP server

## Database Schema
All transactional tables include `year` + `month` for monthly history.
- `incomes`: name, amount, year, month
- `fixed_expenses`: name, category, estimate_amount, actual_amount, due_day, is_paid, year, month
- `daily_expenses`: name, amount, year, month

## API Contracts
- List/create require `year` + `month` (query or JSON body)
- Update/delete use `id`
- `POST /api/month` copies prior month's incomes + fixed (unpaid reset) if target month is empty.
