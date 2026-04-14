const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getLiturgicalSeason, getYearlySeasons } = require('../lib/liturgicalCalendar');

// GET /api/liturgical-seasons/current?date=&denomination_id=
router.get('/current', asyncHandler(async (req, res) => {
  const { date = new Date().toISOString().slice(0, 10), denomination_id = 1 } = req.query;
  const season = getLiturgicalSeason(date, parseInt(denomination_id));
  res.json(season);
}));

// GET /api/liturgical-seasons?year=&denomination_id=
router.get('/', asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear(), denomination_id = 1 } = req.query;
  const seasons = getYearlySeasons(parseInt(year), parseInt(denomination_id));
  res.json(seasons);
}));

module.exports = router;
