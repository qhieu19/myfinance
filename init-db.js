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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created fixed_expenses table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created daily_expenses table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created incomes table');

    // Seed sample data only when tables are empty
    const { rows: incomeCount } = await client.query('SELECT COUNT(*)::int AS n FROM incomes');
    if (incomeCount[0].n === 0) {
      await client.query(`
        INSERT INTO incomes (name, amount) VALUES
          ('Lương chồng', 35000000),
          ('Lương vợ', 20000000),
          ('Thu nhập khác', 5000000);
      `);
      console.log('Seeded incomes');
    }

    const { rows: fixedCount } = await client.query('SELECT COUNT(*)::int AS n FROM fixed_expenses');
    if (fixedCount[0].n === 0) {
      await client.query(`
        INSERT INTO fixed_expenses (name, category, estimate_amount, actual_amount, due_day, is_paid) VALUES
          ('Tiền gốc', 'Tiền Mua Nhà', 12000000, 12000000, 5, true),
          ('Tiền lãi', 'Tiền Mua Nhà', 8500000, 8500000, 5, true),
          ('Tiền Điện', 'Tiền Sinh Hoạt', 1500000, 0, NULL, false),
          ('Tiền Nước', 'Tiền Sinh Hoạt', 200000, 0, NULL, false),
          ('Tiền Mạng', 'Tiền Sinh Hoạt', 300000, 300000, NULL, true),
          ('Phí dịch vụ', 'Tiền Sinh Hoạt', 800000, 0, NULL, false),
          ('Phí gửi xe', 'Tiền Sinh Hoạt', 500000, 500000, NULL, true),
          ('Thẻ tín dụng HSBC', 'Thẻ Tín Dụng', 5000000, 0, 15, false),
          ('Thẻ tín dụng VCB', 'Thẻ Tín Dụng', 3000000, 0, 20, false);
      `);
      console.log('Seeded fixed_expenses');
    }

    const { rows: dailyCount } = await client.query('SELECT COUNT(*)::int AS n FROM daily_expenses');
    if (dailyCount[0].n === 0) {
      await client.query(`
        INSERT INTO daily_expenses (name, amount) VALUES
          ('Đi chợ', 250000);
      `);
      console.log('Seeded daily_expenses');
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
