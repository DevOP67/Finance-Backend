// Mock the db module before requiring the service
jest.mock("../src/db", () => ({
  query:    jest.fn(),
  queryOne: jest.fn(),
}));

const db = require("../src/db");
const dashboardService = require("../src/services/dashboardService");

describe("dashboardService.getSummary", () => {
  afterEach(() => jest.clearAllMocks());

  test("calculates netBalance and savingsRate correctly", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        total_income:    "8000",
        total_expenses:  "3000",
        record_count:    "10",
        income_count:    "4",
        expense_count:   "6",
        largest_transaction: "5000",
        avg_transaction: "1100",
      }],
    });

    const result = await dashboardService.getSummary({});
    expect(result.totalIncome).toBe(8000);
    expect(result.totalExpenses).toBe(3000);
    expect(result.netBalance).toBe(5000);
    expect(result.savingsRate).toBe(62.5);
    expect(result.recordCount).toBe(10);
  });

  test("savingsRate is 0 when income is 0", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        total_income: "0", total_expenses: "500",
        record_count: "2", income_count: "0", expense_count: "2",
        largest_transaction: "500", avg_transaction: "250",
      }],
    });
    const result = await dashboardService.getSummary({});
    expect(result.savingsRate).toBe(0);
    expect(result.netBalance).toBe(-500);
  });
});

describe("dashboardService.getByCategory", () => {
  afterEach(() => jest.clearAllMocks());

  test("maps rows to category objects with net", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { category: "salary", income: "5000", expense: "0", count: "1" },
        { category: "food",   income: "0",    expense: "300", count: "3" },
      ],
    });
    const result = await dashboardService.getByCategory({});
    expect(result[0]).toEqual({ category: "salary", income: 5000, expense: 0, net: 5000, count: 1 });
    expect(result[1].net).toBe(-300);
  });
});

describe("dashboardService.getTrends", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns trend rows with net computed", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { period: "2024-03-01", income: "4000", expense: "1500", count: "5" },
        { period: "2024-04-01", income: "5000", expense: "2000", count: "6" },
      ],
    });
    const result = await dashboardService.getTrends({ period: "monthly" });
    expect(result).toHaveLength(2);
    expect(result[0].net).toBe(2500);
    expect(result[1].income).toBe(5000);
  });
});
