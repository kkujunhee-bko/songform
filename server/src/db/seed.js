require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function seed() {
  const seedsDir = path.join(__dirname, 'seeds');
  const files = fs.readdirSync(seedsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    console.log(`Running seed: ${file}`);
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`  ✓ Done`);
  }

  console.log('\nAll seeds complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
