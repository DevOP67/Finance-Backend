const { AppError, notFound, forbidden, conflict, badRequest } = require("../src/middleware/errorHandler");

describe("AppError", () => {
  test("creates error with statusCode and code", () => {
    const err = new AppError("Something went wrong", 422, "VALIDATION");
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("VALIDATION");
    expect(err.isOperational).toBe(true);
  });

  test("notFound factory returns 404", () => {
    const err = notFound("User not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  test("forbidden factory returns 403", () => {
    const err = forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  test("conflict factory returns 409", () => {
    const err = conflict("Email taken");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Email taken");
  });

  test("badRequest factory returns 400", () => {
    const err = badRequest("Invalid input");
    expect(err.statusCode).toBe(400);
  });
});

describe("errorHandler middleware", () => {
  const { errorHandler } = require("../src/middleware/errorHandler");
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  test("returns statusCode and error from AppError", () => {
    const err = new AppError("Not found", 404, "NOT_FOUND");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Not found", code: "NOT_FOUND" });
  });

  test("returns 500 for non-operational errors", () => {
    const err = new Error("Unexpected crash");
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error", code: "SERVER_ERROR" });
  });

  test("handles pg unique constraint (23505) as 409", () => {
    const err = Object.assign(new Error("dup"), { code: "23505" });
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("handles pg foreign key (23503) as 400", () => {
    const err = Object.assign(new Error("fk"), { code: "23503" });
    const res = mockRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
