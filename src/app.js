require("dotenv").config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET not set");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL not set");
  process.exit(1);
}

const express = require("express");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimit");
const { errorHandler } = require("./middleware/errorHandler");
const { swaggerUi, spec } = require("./swagger");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "50kb" }));
app.use(globalLimiter);

// Docs
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(spec, { customSiteTitle: "Finance API Docs" }),
);

// Routes
app.use("/api", require("./routes/users"));
app.use("/api", require("./routes/records"));
app.use("/api", require("./routes/dashboard"));

// Health
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

// 404
app.use((req, res) =>
  res.status(404).json({ error: "Route not found", code: "NOT_FOUND" }),
);

// Centralized error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Finance API  →  http://localhost:${PORT}`);
    console.log(`Swagger docs →  http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;
