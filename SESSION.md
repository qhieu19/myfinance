# MyFinance – Session: codebase explained

This file orients a new chat/session on how the project is built and how data flows.

## What the app does

Track **monthly** household money: incomes, fixed bills (with due day + paid flag), and daily expenses. Show remaining balance. Export CSV near month-end (UI reminds on days 25–30).

## Architecture (one sentence)

`public/` UI calls `/api/*` → Node handlers use `lib/db.js` (`pg`) → Supabase Postgres; locally `server.js` serves both, on Vercel `api/` is serverless and `vercel.json` maps static files from `public/`.

## Folder map

```
public/          UI only (no secrets)
  index.html     Structure + modals
  script.js      State, month nav, CRUD, CSV, paid colors
  style.css      Layout + .paid / .unpaid / .btn-export.remind
api/             One file per resource (Vercel entrypoints)
  incomes.js
  fixed-expenses.js
  daily-expenses.js
  month.js       Bootstrap/copy previous month
lib/
  db.js          getPool()
  http.js        JSON helpers + year/month parsing
scripts/
  init-db.js     Schema migrate + seed
server.js        Local HTTP server
vercel.json      Static rewrites
idea.md          Product plan + feature checklist
```

## Key UI state (`public/script.js`)

- `viewYear`, `viewMonth` — selected month
- `incomes`, `fixedExpenses`, `dailyExpenses` — arrays for that month
- `loadAll()` — POST `/api/month` then GET three resources
- `exportCsv()` — builds UTF-8 BOM CSV for the viewed month
- `updateExportReminder()` — adds `.remind` if today’s day is 25–30

## Key API contracts

- List/create require **year** + **month** (query or JSON body)
- Update/delete use **id**
- `POST /api/month` `{ year, month }` copies prior month’s incomes + fixed (unpaid reset) if target month empty

## Database

Columns `year`, `month` on all three tables. Indexes `(year, month)`.  
`npm run init-db` is idempotent (CREATE IF NOT EXISTS + ALTER ADD COLUMN).

## Deploy / secrets

- Production: https://myfinance-tau-peach.vercel.app  
- `DATABASE_URL` in Vercel env (same Session pooler as local `.env`)  
- Never commit `.env`

## When changing code

1. Schema → edit `scripts/init-db.js`, run `npm run init-db`  
2. API → edit `api/*.js`, keep `lib/http.js` helpers  
3. UI → edit `public/*`  
4. Redeploy → `npx vercel --prod` (and push git if asked)
