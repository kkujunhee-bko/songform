require('dotenv').config();
const app = require('./app');
const { ensureAdmin } = require('./db/initAdmin');

const PORT = process.env.PORT || 3001;

async function start() {
  await ensureAdmin();
  app.listen(PORT, () => {
    console.log(`\n🎵 SongForm API Server`);
    console.log(`   Server: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

start().catch(err => {
  console.error('서버 시작 실패:', err);
  process.exit(1);
});
