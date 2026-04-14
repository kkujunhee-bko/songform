const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/settings
router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT key, value FROM app_settings');
  const settings = {};
  result.rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
}));

// PUT /api/settings/:key
router.put('/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  await query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, JSON.stringify(value)]
  );
  res.json({ key, value });
}));

module.exports = router;
