require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL. Copy .env.example to .env and set your connection string.');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const now = new Date();
const SEED_YEAR = now.getFullYear();
const SEED_MONTH = now.getMonth() + 1;

async function ensureMonthColumns(table) {
  await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS year INTEGER`);
  await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS month INTEGER`);
  await client.query(`
    UPDATE ${table}
    SET year = COALESCE(year, EXTRACT(YEAR FROM created_at)::int, $1),
        month = COALESCE(month, EXTRACT(MONTH FROM created_at)::int, $2)
    WHERE year IS NULL OR month IS NULL
  `, [SEED_YEAR, SEED_MONTH]);
  await client.query(`ALTER TABLE ${table} ALTER COLUMN year SET NOT NULL`);
  await client.query(`ALTER TABLE ${table} ALTER COLUMN month SET NOT NULL`);
}

async function initDB() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    await client.query(`
      CREATE TABLE IF NOT EXISTS fixed_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        estimate_amount INTEGER NOT NULL DEFAULT 0,
        actual_amount INTEGER NOT NULL DEFAULT 0,
        due_day INTEGER,
        is_paid BOOLEAN NOT NULL DEFAULT false,
        year INTEGER NOT NULL DEFAULT ${SEED_YEAR},
        month INTEGER NOT NULL DEFAULT ${SEED_MONTH},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created fixed_expenses table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        year INTEGER NOT NULL DEFAULT ${SEED_YEAR},
        month INTEGER NOT NULL DEFAULT ${SEED_MONTH},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created daily_expenses table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        year INTEGER NOT NULL DEFAULT ${SEED_YEAR},
        month INTEGER NOT NULL DEFAULT ${SEED_MONTH},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created incomes table');

    await ensureMonthColumns('fixed_expenses');
    await ensureMonthColumns('daily_expenses');
    await ensureMonthColumns('incomes');
    console.log('Ensured year/month columns');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_fixed_ym ON fixed_expenses (year, month);
      CREATE INDEX IF NOT EXISTS idx_daily_ym ON daily_expenses (year, month);
      CREATE INDEX IF NOT EXISTS idx_incomes_ym ON incomes (year, month);
    `);

    const { rows: incomeCount } = await client.query(
      'SELECT COUNT(*)::int AS n FROM incomes WHERE year = $1 AND month = $2',
      [SEED_YEAR, SEED_MONTH]
    );
    if (incomeCount[0].n === 0) {
      const { rows: anyIncome } = await client.query('SELECT COUNT(*)::int AS n FROM incomes');
      if (anyIncome[0].n === 0) {
        await client.query(`
          INSERT INTO incomes (name, amount, year, month) VALUES
            ('Lương chồng', 35000000, $1, $2),
            ('Lương vợ', 20000000, $1, $2),
            ('Thu nhập khác', 5000000, $1, $2);
        `, [SEED_YEAR, SEED_MONTH]);
        console.log('Seeded incomes for', SEED_MONTH, SEED_YEAR);
      }
    }

    const { rows: fixedCount } = await client.query(
      'SELECT COUNT(*)::int AS n FROM fixed_expenses WHERE year = $1 AND month = $2',
      [SEED_YEAR, SEED_MONTH]
    );
    if (fixedCount[0].n === 0) {
      const { rows: anyFixed } = await client.query('SELECT COUNT(*)::int AS n FROM fixed_expenses');
      if (anyFixed[0].n === 0) {
        await client.query(`
          INSERT INTO fixed_expenses (name, category, estimate_amount, actual_amount, due_day, is_paid, year, month) VALUES
            ('Tiền gốc', 'Tiền Mua Nhà', 12000000, 12000000, 5, true, $1, $2),
            ('Tiền lãi', 'Tiền Mua Nhà', 8500000, 8500000, 5, true, $1, $2),
            ('Tiền Điện', 'Tiền Sinh Hoạt', 1500000, 0, NULL, false, $1, $2),
            ('Tiền Nước', 'Tiền Sinh Hoạt', 200000, 0, NULL, false, $1, $2),
            ('Tiền Mạng', 'Tiền Sinh Hoạt', 300000, 300000, NULL, true, $1, $2),
            ('Phí dịch vụ', 'Tiền Sinh Hoạt', 800000, 0, NULL, false, $1, $2),
            ('Phí gửi xe', 'Tiền Sinh Hoạt', 500000, 500000, NULL, true, $1, $2),
            ('Thẻ tín dụng HSBC', 'Thẻ Tín Dụng', 5000000, 0, 15, false, $1, $2),
            ('Thẻ tín dụng VCB', 'Thẻ Tín Dụng', 3000000, 0, 20, false, $1, $2);
        `, [SEED_YEAR, SEED_MONTH]);
        console.log('Seeded fixed_expenses for', SEED_MONTH, SEED_YEAR);
      }
    }

    const { rows: dailyCount } = await client.query(
      'SELECT COUNT(*)::int AS n FROM daily_expenses WHERE year = $1 AND month = $2',
      [SEED_YEAR, SEED_MONTH]
    );
    if (dailyCount[0].n === 0) {
      const { rows: anyDaily } = await client.query('SELECT COUNT(*)::int AS n FROM daily_expenses');
      if (anyDaily[0].n === 0) {
        await client.query(`
          INSERT INTO daily_expenses (name, amount, year, month) VALUES
            ('Đi chợ', 250000, $1, $2);
        `, [SEED_YEAR, SEED_MONTH]);
        console.log('Seeded daily_expenses for', SEED_MONTH, SEED_YEAR);
      }
    }

    console.log('Database initialization completed successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

initDB();
