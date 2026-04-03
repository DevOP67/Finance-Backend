const express = require("express");
const { query } = require("express-validator");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const ctrl = require("../controllers/dashboardController");

const router = express.Router();

const dateRange = [
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
];

router.get("/dashboard/summary",      authenticate, dateRange, validate, ctrl.summary);
router.get("/dashboard/by-category",  authenticate, dateRange, validate, ctrl.byCategory);
router.get("/dashboard/top-expenses", authenticate, dateRange, validate, ctrl.topExpenses);
router.get("/dashboard/recent",       authenticate, ctrl.recent);
router.get("/dashboard/trends",
  authenticate,
  requireRole("analyst","admin"),
  [...dateRange, query("period").optional().isIn(["monthly","weekly"])],
  validate,
  ctrl.trends
);

module.exports = router;
