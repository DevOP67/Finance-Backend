const express = require("express");
const { body } = require("express-validator");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimit");
const ctrl = require("../controllers/userController");

const router = express.Router();

router.post("/auth/register", authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min 6 chars"),
    body("role").optional().isIn(["viewer","analyst","admin"]),
  ],
  validate, ctrl.register
);

router.post("/auth/login", authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validate, ctrl.login
);

router.get("/users",        authenticate, requireRole("admin"), ctrl.listUsers);
router.get("/users/me",     authenticate, ctrl.getMe);
router.get("/users/:id",    authenticate, requireRole("admin"), ctrl.getUser);
router.patch("/users/:id",  authenticate, requireRole("admin"),
  [
    body("role").optional().isIn(["viewer","analyst","admin"]),
    body("status").optional().isIn(["active","inactive"]),
    body("name").optional().trim().notEmpty(),
  ],
  validate, ctrl.patchUser
);
router.delete("/users/:id", authenticate, requireRole("admin"), ctrl.deleteUser);

module.exports = router;
