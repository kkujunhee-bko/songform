const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function ensureAdmin() {
  try {
    const result = await query("SELECT id FROM users WHERE email = 'admin'");
    if (result.rows.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        ['관리자', 'admin', hash, 'admin']
      );
      console.log('  ✓ Admin user created  (admin / 123456)');
    }
  } catch (err) {
    console.warn('  ⚠ ensureAdmin 건너뜀:', err.message);
  }
}

module.exports = { ensureAdmin };
