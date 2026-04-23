const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { requireAuth } = require('./middleware/authMiddleware');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 인증 라우트 (로그인/me/theme) — 공개
app.use('/api/auth', require('./routes/auth'));

// ── 이하 모든 API는 로그인 필요
app.use('/api', requireAuth);

app.use('/api/users',             require('./routes/users'));
app.use('/api/members',           require('./routes/members'));
app.use('/api/denominations',     require('./routes/denominations'));
app.use('/api/worship-categories',require('./routes/worshipCategories'));
app.use('/api/song-form-elements',require('./routes/songFormElements'));
app.use('/api/songs',             require('./routes/songs'));
app.use('/api/worship-forms',     require('./routes/worshipForms'));
app.use('/api/liturgical-seasons',require('./routes/liturgicalSeasons'));
app.use('/api/sheet-music',       require('./routes/sheetMusic'));
app.use('/api/export',            require('./routes/export'));
app.use('/api/settings',          require('./routes/settings'));
app.use('/api/role-permissions',  require('./routes/rolePermissions'));
app.use('/api/song-form-preset-categories', require('./routes/songFormPresetCategories'));
app.use('/api/song-form-presets',           require('./routes/songFormPresets'));

// 저장된 악보 이미지 정적 서빙
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 프로덕션: 빌드된 React 앱 서빙
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
