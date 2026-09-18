const { getPool } = require('../lib/db');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return send(res, 204, {});
  }

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT id, name, category, estimate_amount, actual_amount, due_day, is_paid, created_at
         FROM fixed_expenses
         ORDER BY category, created_at ASC`
      );
      return send(res, 200, rows);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const name = (body.name || '').trim();
      const category = (body.category || '').trim() || 'Khác';
      const estimate_amount = parseInt(body.estimate_amount, 10) || 0;
      const actual_amount = parseInt(body.actual_amount, 10) || 0;
      const due_day = body.due_day === '' || body.due_day == null ? null : parseInt(body.due_day, 10);
      const is_paid = Boolean(body.is_paid);
      if (!name) return send(res, 400, { error: 'Invalid name' });

      const { rows } = await pool.query(
        `INSERT INTO fixed_expenses (name, category, estimate_amount, actual_amount, due_day, is_paid)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, category, estimate_amount, actual_amount, due_day, is_paid, created_at`,
        [name, category, estimate_amount, actual_amount, due_day, is_paid]
      );
      return send(res, 201, rows[0]);
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const id = body.id;
      if (!id) return send(res, 400, { error: 'Missing id' });

      const estimate_amount = parseInt(body.estimate_amount, 10) || 0;
      const actual_amount = parseInt(body.actual_amount, 10) || 0;
      const due_day = body.due_day === '' || body.due_day == null ? null : parseInt(body.due_day, 10);
      const is_paid = Boolean(body.is_paid);

      const { rows } = await pool.query(
        `UPDATE fixed_expenses
         SET estimate_amount = $1, actual_amount = $2, due_day = $3, is_paid = $4
         WHERE id = $5
         RETURNING id, name, category, estimate_amount, actual_amount, due_day, is_paid, created_at`,
        [estimate_amount, actual_amount, due_day, is_paid, id]
      );
      if (!rows[0]) return send(res, 404, { error: 'Not found' });
      return send(res, 200, rows[0]);
    }

    if (req.method === 'DELETE') {
      const body = await readBody(req);
      const id = body.id || new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return send(res, 400, { error: 'Missing id' });
      const { rowCount } = await pool.query('DELETE FROM fixed_expenses WHERE id = $1', [id]);
      if (!rowCount) return send(res, 404, { error: 'Not found' });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Server error' });
  }
};
