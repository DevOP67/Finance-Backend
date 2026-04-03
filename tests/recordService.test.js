jest.mock("../src/db", () => ({
  query:    jest.fn(),
  queryOne: jest.fn(),
}));

const db = require("../src/db");
const recordService = require("../src/services/recordService");
const { AppError } = require("../src/middleware/errorHandler");

describe("recordService.listRecords", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns paginated records", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: "25" }] })       // count query
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] }); // data query

    const result = await recordService.listRecords({ page: "2", limit: "10" });
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.total).toBe(25);
    expect(result.pagination.pages).toBe(3);
    expect(result.records).toHaveLength(2);
  });

  test("defaults to page 1 limit 20", async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: "5" }] })
      .mockResolvedValueOnce({ rows: [] });
    const result = await recordService.listRecords({});
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
  });
});

describe("recordService.getRecordById", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns record when found", async () => {
    db.queryOne.mockResolvedValueOnce({ id: 5, amount: 100 });
    const record = await recordService.getRecordById(5);
    expect(record.id).toBe(5);
  });

  test("throws notFound when record missing", async () => {
    db.queryOne.mockResolvedValueOnce(null);
    await expect(recordService.getRecordById(999)).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("recordService.updateRecord", () => {
  afterEach(() => jest.clearAllMocks());

  test("throws forbidden if analyst edits another users record", async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1, created_by: 10, deleted_at: null });
    const analyst = { id: 99, role: "analyst" };
    await expect(
      recordService.updateRecord(1, { amount: 200 }, analyst)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("allows analyst to edit own record", async () => {
    db.queryOne
      .mockResolvedValueOnce({ id: 1, created_by: 5, deleted_at: null }) // existing
      .mockResolvedValueOnce({ id: 1, amount: 200 });                     // updated
    const analyst = { id: 5, role: "analyst" };
    const result = await recordService.updateRecord(1, { amount: 200 }, analyst);
    expect(result.amount).toBe(200);
  });
});

describe("recordService.softDeleteRecord", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns deleted record snapshot", async () => {
    db.queryOne.mockResolvedValueOnce({ id: 3, amount: 500, deleted_at: "2024-01-01" });
    const result = await recordService.softDeleteRecord(3);
    expect(result.id).toBe(3);
    expect(result.deleted_at).toBeTruthy();
  });

  test("throws notFound if already deleted", async () => {
    db.queryOne.mockResolvedValueOnce(null);
    await expect(recordService.softDeleteRecord(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
