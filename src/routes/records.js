const express = require("express");
const { body, query } = require("express-validator");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const ctrl = require("../controllers/recordController");

const router = express.Router();

const CATEGORIES = ["salary","freelance","investment","rent","utilities","food",
  "transport","healthcare","entertainment","tax","insurance","loan","transfer","other"];
const TYPES = ["income","expense"];

const dateFilters = [
  query("type").optional().isIn(TYPES),
  query("category").optional().isIn(CATEGORIES),
  query("from").optional().isISO8601().withMessage("from must be ISO date"),
  query("to").optional().isISO8601().withMessage("to must be ISO date"),
  query("minAmount").optional().isFloat({ min: 0 }),
  query("maxAmount").optional().isFloat({ min: 0 }),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("search").optional().isString().trim(),
];

router.get("/records",     authenticate, dateFilters, validate, ctrl.list);
router.get("/records/:id", authenticate, ctrl.getOne);

router.post("/records", authenticate, requireRole("analyst","admin"),
  [
    body("amount").isFloat({ min: 0.01 }).withMessage("Amount must be > 0"),
    body("type").isIn(TYPES).withMessage("Type must be income or expense"),
    body("category").isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(", ")}`),
    body("date").isISO8601().withMessage("Date must be YYYY-MM-DD"),
    body("notes").optional().isString().isLength({ max: 500 }).trim(),
  ],
  validate, ctrl.create
);

router.put("/records/:id", authenticate, requireRole("analyst","admin"),
  [
    body("amount").optional().isFloat({ min: 0.01 }),
    body("type").optional().isIn(TYPES),
    body("category").optional().isIn(CATEGORIES),
    body("date").optional().isISO8601(),
    body("notes").optional().isString().isLength({ max: 500 }).trim(),
  ],
  validate, ctrl.update
);

router.delete("/records/:id", authenticate, requireRole("admin"), ctrl.remove);

module.exports = router;
