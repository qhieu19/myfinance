const { getPool } = require('../lib/db');
const { send, readBody, parseYearMonth } = require('../lib/http');

const COLS = 'id, name, amount, year, month, created_at';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const ym = parseYearMonth(req);
      if (!ym) return send(res, 400, { error: 'year and month required' });
      const { rows } = await pool.query(
        `SELECT ${COLS} FROM incomes WHERE year = $1 AND month = $2 ORDER BY created_at ASC`,
        [ym.year, ym.month]
      );
      return send(res, 200, rows);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const ym = parseYearMonth(req, body);
      const name = (body.name || '').trim();
      const amount = parseInt(body.amount, 10);
      if (!ym || !name || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid name, amount, year, or month' });
      }
      const { rows } = await pool.query(
        `INSERT INTO incomes (name, amount, year, month) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
        [name, amount, ym.year, ym.month]
      );
      return send(res, 201, rows[0]);
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const id = body.id;
      const name = (body.name || '').trim();
      const amount = parseInt(body.amount, 10);
      if (!id || !name || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid id, name, or amount' });
      }
      const { rows } = await pool.query(
        `UPDATE incomes SET name = $1, amount = $2 WHERE id = $3 RETURNING ${COLS}`,
        [name, amount, id]
      );
      if (!rows[0]) return send(res, 404, { error: 'Not found' });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = body.id || new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return send(res, 400, { error: 'Missing id' });
      const { rowCount } = await pool.query('DELETE FROM incomes WHERE id = $1', [id]);
      if (!rowCount) return send(res, 404, { error: 'Not found' });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
};
