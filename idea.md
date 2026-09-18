# MyFinance – Plan

## Problem
Monthly income ~60M VND. Need to track fixed bills (due on different days) and daily spending, then always see remaining balance.

## Solution
Simple mobile-friendly web app: incomes + fixed expenses + daily expenses, with live remaining balance.

## Stack
- **Frontend**: vanilla HTML/CSS/JS (`frontend/`)
- **API**: Node routes (`api/`) — local via `server.js`, deploy on Vercel Hobby
- **DB**: Supabase Postgres (Session pooler)
- Secrets in `.env` only (`DATABASE_URL`). Never commit `.env`.

## Schema
- `incomes` — name, amount
- `fixed_expenses` — name, category, estimate_amount, actual_amount, due_day, is_paid
- `daily_expenses` — name, amount

## Features
| Feature | Status |
|---------|--------|
| UI: tabs, summary, modals | Done |
| CRUD incomes | Done |
| CRUD daily expenses | Done |
| CRUD fixed expenses | Done |
| Persist to Supabase | Done |
| Seed default monthly data | Done (`npm run init-db`) |
| Deploy Vercel + `DATABASE_URL` env | Done — https://myfinance-tau-peach.vercel.app |
| Month selector / history | Later |

## Commands
```bash
npm run init-db   # create tables + seed
npm run dev       # http://localhost:3000
```

## Deploy (Vercel)
1. Set `DATABASE_URL` in Vercel project env (Session pooler URI from `.env`).
2. Deploy repo; static UI + `/api/*` routes.
3. Open site and verify CRUD persists after refresh.

## Connection
Use Session pooler:
`postgresql://postgres.<ref>:<password>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`
Encode `@` in password as `%40`.
