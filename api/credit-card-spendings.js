const { getPool } = require('../lib/db');
const { send, readBody, parseYearMonth, parseEntryDate } = require('../lib/http');

const COLS = 'id, card_name, amount, transaction_date, year, month, created_at';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const ym = parseYearMonth(req);
      if (!ym) return send(res, 400, { error: 'year and month required' });
      const { rows } = await pool.query(
        `SELECT ${COLS} FROM credit_card_spendings WHERE year = $1 AND month = $2 ORDER BY transaction_date DESC, created_at DESC`,
        [ym.year, ym.month]
      );
      return send(res, 200, rows);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const ym = parseYearMonth(req, body);
      const cardName = (body.card_name || '').trim();
      const amount = parseInt(body.amount, 10);
      const entry = parseEntryDate(body, ym);
      if (!entry.year || !entry.month || !cardName || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid card name, amount, year, or month' });
      }
      const txDate = entry.iso || `${entry.year}-${String(entry.month).padStart(2, '0')}-${String(entry.day || 1).padStart(2, '0')}`;
      const { rows } = await pool.query(
        `INSERT INTO credit_card_spendings (card_name, amount, transaction_date, year, month)
         VALUES ($1, $2, $3::date, $4, $5) RETURNING ${COLS}`,
        [cardName, amount, txDate, entry.year, entry.month]
      );
      return send(res, 201, rows[0]);
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const id = body.id;
      const cardName = (body.card_name || '').trim();
      const amount = parseInt(body.amount, 10);
      const ym = parseYearMonth(req, body);
      const entry = parseEntryDate(body, ym);
      if (!id || !cardName || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid id, card name, or amount' });
      }
      const txDate = entry.iso || (entry.year && entry.month && entry.day
        ? `${entry.year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`
        : null);
      const { rows } = await pool.query(
        `UPDATE credit_card_spendings
         SET card_name = $1, amount = $2,
             transaction_date = COALESCE($3::date, transaction_date),
             year = COALESCE($4, year), month = COALESCE($5, month)
         WHERE id = $6 RETURNING ${COLS}`,
        [cardName, amount, txDate, entry.year || null, entry.month || null, id]
      );
      if (!rows[0]) return send(res, 404, { error: 'Not found' });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = body.id || new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return send(res, 400, { error: 'Missing id' });
      const { rowCount } = await pool.query('DELETE FROM credit_card_spendings WHERE id = $1', [id]);
      if (!rowCount) return send(res, 404, { error: 'Not found' });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
};
