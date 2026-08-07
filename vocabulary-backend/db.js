// db.js
const { Pool } = require('pg');
require('dotenv').config();

const rawDbUrl = process.env.DATABASE_URL;

const connectionConfig = rawDbUrl
  ? {
      connectionString: rawDbUrl.replace(/sslmode=(require|prefer|verify-ca)/gi, 'sslmode=no-verify'),
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};