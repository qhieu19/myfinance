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

function parseYearMonth(req, body = {}) {
  const url = new URL(req.url, 'http://localhost');
  const year = parseInt(url.searchParams.get('year') || body.year, 10);
  const month = parseInt(url.searchParams.get('month') || body.month, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

/** Accepts `date` / `transaction_date` as YYYY-MM-DD, or `day` with fallback year/month. */
function parseEntryDate(body = {}, fallbackYm = null) {
  const raw = String(body.date || body.transaction_date || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day, iso: raw };
    }
  }
  const day = parseInt(body.day, 10);
  return {
    year: fallbackYm && fallbackYm.year,
    month: fallbackYm && fallbackYm.month,
    day: Number.isFinite(day) && day >= 1 && day <= 31 ? day : null,
    iso: null,
  };
}

module.exports = { send, readBody, parseYearMonth, parseEntryDate };
