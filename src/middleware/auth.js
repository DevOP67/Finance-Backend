const jwt = require("jsonwebtoken");
const { queryOne } = require("../db");

// SECRET is guaranteed to exist — app.js crashes on startup if missing
const SECRET = process.env.JWT_SECRET;

const ROLES = { viewer: 1, analyst: 2, admin: 3 };

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing or invalid token" });
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    const user = await queryOne(
      "SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL",
      [payload.id]
    );
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status !== "active")
      return res.status(403).json({ error: "Account is inactive" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// requireRole("analyst") — user must be AT LEAST analyst level
// requireRole("admin")   — user must be exactly admin
function requireRole(...roles) {
  return (req, res, next) => {
    const userLevel = ROLES[req.user?.role] ?? 0;
    const required  = Math.min(...roles.map((r) => ROLES[r] ?? 99));
    if (userLevel < required)
      return res.status(403).json({ error: "Insufficient permissions for this action" });
    next();
  };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "24h" });
}

module.exports = { authenticate, requireRole, generateToken, SECRET };
