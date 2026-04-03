/**
 * Centralized error handler.
 * All routes call next(err) or throw an AppError — this catches everything.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Convenience factories
const notFound = (msg = "Resource not found") =>
  new AppError(msg, 404, "NOT_FOUND");
const forbidden = (msg = "Insufficient permissions") =>
  new AppError(msg, 403, "FORBIDDEN");
const conflict = (msg = "Resource already exists") =>
  new AppError(msg, 409, "CONFLICT");
const badRequest = (msg = "Bad request") =>
  new AppError(msg, 400, "BAD_REQUEST");

// Express error middleware (4-arg signature required)
function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  // Postgres unique-constraint violation
  if (err.code === "23505") {
    return res.status(409).json({
      error: "A record with that value already exists",
      code: "CONFLICT",
    });
  }
  // Postgres foreign-key violation
  if (err.code === "23503") {
    return res.status(400).json({
      error: "Referenced resource does not exist",
      code: "BAD_REQUEST",
    });
  }

  const status = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";
  const code = err.code || "SERVER_ERROR";

  if (!err.isOperational && process.env.NODE_ENV !== "test") {
    console.error("[Unhandled]", err);
  }

  res.status(status).json({ error: message, code });
}

module.exports = {
  AppError,
  errorHandler,
  notFound,
  forbidden,
  conflict,
  badRequest,
};
