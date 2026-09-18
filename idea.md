# MyFinance – Plan & Features

## Problem
Monthly household income ~60M VND. Track fixed bills (different due days) and daily spending, always see remaining balance, keep history by month.

## Solution
Mobile-friendly web app with incomes, fixed expenses, and daily expenses — data lives in Supabase Postgres, UI on Vercel.

**Live:** https://myfinance-tau-peach.vercel.app

## Stack
| Layer | Path / tech |
|-------|-------------|
| UI | `public/` — vanilla HTML / CSS / JS |
| API | `api/` — Vercel serverless (also served by `server.js` locally) |
| Shared | `lib/db.js`, `lib/http.js` |
| DB setup | `scripts/init-db.js` |
| DB | Supabase Postgres (Session pooler) |
| Secrets | `.env` → `DATABASE_URL` (never commit) |

## Folder layout
```
myfinance/
├── public/           # Static UI (index, script, style)
├── api/              # HTTP handlers → /api/*
├── lib/              # DB pool + HTTP helpers
├── scripts/init-db.js
├── server.js         # Local: static + API
├── vercel.json
├── idea.md
└── .cursor/rules/    # Agent session context
```

## Database schema
All transactional tables include **`year`** + **`month`** for monthly history.

- **incomes** — name, amount, year, month
- **fixed_expenses** — name, category, estimate_amount, actual_amount, due_day, is_paid, year, month
- **daily_expenses** — name, amount, year, month

## Features (current)
| Feature | Detail |
|---------|--------|
| Summary card | Income, spent, remaining, % progress, fixed vs daily chips |
| Tabs | Cố định / Hàng ngày / Thu nhập |
| CRUD | Add / edit / delete for all three types |
| Paid colors | Fixed: paid amount **green**, unpaid **red** |
| Month navigator | ‹ › switches month; data filtered by year+month |
| Copy prior month | Empty month auto-copies incomes + fixed (reset unpaid) via `POST /api/month` |
| Export CSV | Button downloads current month; **highlights/pulses days 25–30** |
| Deploy | Vercel Hobby + Supabase free |

## API
| Method | Path | Notes |
|--------|------|--------|
| GET/POST/PUT/DELETE | `/api/incomes` | GET/POST need `?year=&month=` / body |
| GET/POST/PUT/DELETE | `/api/fixed-expenses` | same |
| GET/POST/PUT/DELETE | `/api/daily-expenses` | same |
| POST | `/api/month` | `{ year, month }` — bootstrap copy from previous month |

## Commands
```bash
npm run init-db   # migrate/create tables + seed if empty
npm run dev       # http://localhost:3000
npx vercel --prod # deploy
```

## Connection
Prefer Session pooler URI in `.env` / Vercel env:
`postgresql://postgres.<ref>:<password>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`  
URL-encode special chars in password (`@` → `%40`).
