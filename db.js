require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

let sslConfig;
try {
  sslConfig = {
    ca: fs.readFileSync('ca.pem') 
  };
} catch (err) {
  console.error('❌ Could not load ca.pem:', err.message);
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


module.exports = pool;


async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to Genz DB via pool');
    conn.release();
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err.message);
  }
}

