const { getPool } = require('../lib/db');
const { send, readBody, parseYearMonth } = require('../lib/http');

const COLS = 'id, name, amount, day, year, month, created_at';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const ym = parseYearMonth(req);
      if (!ym) return send(res, 400, { error: 'year and month required' });
      const { rows } = await pool.query(
        `SELECT ${COLS} FROM daily_expenses WHERE year = $1 AND month = $2 ORDER BY created_at DESC`,
        [ym.year, ym.month]
      );
      return send(res, 200, rows);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const ym = parseYearMonth(req, body);
      const name = (body.name || '').trim();
      const amount = parseInt(body.amount, 10);
      const day = body.day ? parseInt(body.day, 10) : null;
      if (!ym || !name || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid name, amount, year, or month' });
      }
      const { rows } = await pool.query(
        `INSERT INTO daily_expenses (name, amount, day, year, month) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
        [name, amount, day, ym.year, ym.month]
      );
      return send(res, 201, rows[0]);
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const id = body.id;
      const name = (body.name || '').trim();
      const amount = parseInt(body.amount, 10);
      const day = body.day ? parseInt(body.day, 10) : null;
      if (!id || !name || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid id, name, or amount' });
      }
      const { rows } = await pool.query(
        `UPDATE daily_expenses SET name = $1, amount = $2, day = $3 WHERE id = $4 RETURNING ${COLS}`,
        [name, amount, day, id]
      );
      if (!rows[0]) return send(res, 404, { error: 'Not found' });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = body.id || new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return send(res, 400, { error: 'Missing id' });
      const { rowCount } = await pool.query('DELETE FROM daily_expenses WHERE id = $1', [id]);
      if (!rowCount) return send(res, 404, { error: 'Not found' });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
};
