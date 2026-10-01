# Product Specification

## Problem
Monthly household income needs tracking. Need to track fixed bills (different due days) and daily spending, see remaining balance, and keep history by month.

## Solution
Mobile-friendly web app with incomes, fixed expenses, and daily expenses.

## Core Features
- Summary card: Income, spent, remaining, % progress.
- Tabs: Fixed / Daily / Income.
- CRUD operations for all three types.
- Paid colors: Fixed expenses show paid amount in green, unpaid in red.
- Month navigator: Switch months, data filtered by year+month.
- Copy prior month: Auto-copies incomes + fixed expenses (reset unpaid).
- Export CSV: Downloads current month, highlights/pulses on days 25–30 as a reminder.

## Key UI State
- `viewYear`, `viewMonth` — selected month
- `incomes`, `fixedExpenses`, `dailyExpenses` — arrays for that month

## Local Setup and Run Instructions

1. **Install dependencies:**
   Run `npm install` to install necessary packages.

2. **Environment Configuration:**
   - Make sure you have a `.env` file in the root directory.
   - Add your database connection string:
     ```env
     DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
     ```

3. **Initialize Database (first time only):**
   Run `npm run init-db` to create the required tables automatically.

4. **Start the application:**
   Run `npm run dev`.
   Open your browser and navigate to: `http://localhost:3000`
