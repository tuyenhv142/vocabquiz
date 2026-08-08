// db.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const rawDbUrl = process.env.DATABASE_URL;

// Load CA Certificate if available (via DB_CA_CERT env or local ca.pem file)
let caCert = process.env.DB_CA_CERT;
if (!caCert) {
  const caFilePath = path.join(__dirname, 'ca.pem');
  if (fs.existsSync(caFilePath)) {
    caCert = fs.readFileSync(caFilePath, 'utf8');
  }
}

let sslOption = false;
if (caCert) {
  sslOption = { ca: caCert, rejectUnauthorized: true };
} else if (process.env.DB_SSL !== 'false') {
  sslOption = { rejectUnauthorized: false };
}

const connectionConfig = rawDbUrl
  ? {
      connectionString: rawDbUrl.replace(/sslmode=(require|prefer|verify-ca)/gi, 'sslmode=no-verify'),
      ssl: sslOption,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: sslOption,
    };

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

async function initSchema() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_completed_date DATE;
    `);
    console.log('✅ DB Schema updated: user streak & xp columns initialized');
  } catch (err) {
    console.error('Schema init error (non-fatal):', err.message);
  }
}
initSchema();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};