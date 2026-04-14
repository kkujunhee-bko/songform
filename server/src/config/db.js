const { Pool, types } = require('pg');
require('dotenv').config();

// PostgreSQL DATE 타입(OID 1082)을 JavaScript Date 객체 대신 'YYYY-MM-DD' 문자열로 반환
// pg 기본 동작은 local time midnight Date 객체 → JSON 직렬화 시 UTC로 변환되어 한국(UTC+9) 기준 날짜가 하루 밀리는 문제 방지
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
  }
  return res;
};

module.exports = { pool, query };
