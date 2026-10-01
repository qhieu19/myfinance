const { getPool } = require('../lib/db');
const { send, readBody, parseYearMonth } = require('../lib/http');

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function adjustDueDay(dueDay, year, month) {
  if (dueDay == null) return null;
  const lastDay = daysInMonth(year, month);
  return dueDay > lastDay ? lastDay : dueDay;
}

/** Copy incomes + fixed expenses from the previous month into an empty target month. */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

    const body = await readBody(req);
    const ym = parseYearMonth(req, body);
    if (!ym) return send(res, 400, { error: 'year and month required' });

    const pool = getPool();
    const { year, month } = ym;

    const { rows: existingFixed } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM fixed_expenses WHERE year = $1 AND month = $2',
      [year, month]
    );

    if (existingFixed[0].n > 0) {
      return send(res, 200, { copied: false, reason: 'already_has_data' });
    }

    // Find most recent prior month with data
    const { rows: srcFixed } = await pool.query(
      `SELECT name, category, estimate_amount, due_day
       FROM fixed_expenses
       WHERE (year < $1) OR (year = $1 AND month < $2)
       ORDER BY year DESC, month DESC, created_at ASC`,
      [year, month]
    );

    // Get only the latest source month's rows
    let fixedSource = [];
    if (srcFixed.length) {
      const { rows: latest } = await pool.query(
        `SELECT year, month FROM fixed_expenses
         WHERE (year < $1) OR (year = $1 AND month < $2)
         ORDER BY year DESC, month DESC LIMIT 1`,
        [year, month]
      );
      if (latest[0]) {
        const r = await pool.query(
          `SELECT name, category, estimate_amount, due_day
           FROM fixed_expenses WHERE year = $1 AND month = $2
           ORDER BY category, created_at ASC`,
          [latest[0].year, latest[0].month]
        );
        fixedSource = r.rows;
      }
    }

    let copiedFixed = 0;

    if (existingFixed[0].n === 0 && fixedSource.length) {
      for (const row of fixedSource) {
        await pool.query(
          `INSERT INTO fixed_expenses
             (name, category, estimate_amount, actual_amount, due_day, is_paid, year, month)
           VALUES ($1, $2, $3, 0, $4, false, $5, $6)`,
          [row.name, row.category, row.estimate_amount, adjustDueDay(row.due_day, year, month), year, month]
        );
        copiedFixed += 1;
      }
    }

    return send(res, 200, {
      copied: copiedFixed > 0,
      copiedFixed,
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
};
