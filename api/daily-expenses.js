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
        'SELECT id, name, amount, created_at FROM daily_expenses ORDER BY created_at DESC'
      );
      return send(res, 200, rows);
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const name = (body.name || '').trim();
      const amount = parseInt(body.amount, 10);
      if (!name || !Number.isFinite(amount) || amount <= 0) {
        return send(res, 400, { error: 'Invalid name or amount' });
      }
      const { rows } = await pool.query(
        'INSERT INTO daily_expenses (name, amount) VALUES ($1, $2) RETURNING id, name, amount, created_at',
        [name, amount]
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
        'UPDATE daily_expenses SET name = $1, amount = $2 WHERE id = $3 RETURNING id, name, amount, created_at',
        [name, amount, id]
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
