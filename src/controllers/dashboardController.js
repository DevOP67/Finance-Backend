const dashboardService = require("../services/dashboardService");

async function summary(req, res, next) {
  try {
    res.json({ summary: await dashboardService.getSummary(req.query) });
  } catch (err) { next(err); }
}

async function byCategory(req, res, next) {
  try {
    res.json({ byCategory: await dashboardService.getByCategory(req.query) });
  } catch (err) { next(err); }
}

async function trends(req, res, next) {
  try {
    const period = req.query.period || "monthly";
    res.json({ period, trends: await dashboardService.getTrends({ ...req.query, period }) });
  } catch (err) { next(err); }
}

async function recent(req, res, next) {
  try {
    res.json({ records: await dashboardService.getRecent(req.query.limit) });
  } catch (err) { next(err); }
}

async function topExpenses(req, res, next) {
  try {
    res.json({ topExpenses: await dashboardService.getTopExpenses(req.query) });
  } catch (err) { next(err); }
}

module.exports = { summary, byCategory, trends, recent, topExpenses };
