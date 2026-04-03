const swaggerUi = require("swagger-ui-express");

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Finance Dashboard API",
    version: "1.0.0",
    description:
      "Role-based REST API for financial records management. Roles: **viewer** (read-only), **analyst** (read + create/edit own records), **admin** (full access).",
  },
  servers: [{ url: "/api", description: "API base" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Obtain a token via POST /api/auth/login",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Alice Admin" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["viewer", "analyst", "admin"] },
          status: { type: "string", enum: ["active", "inactive"] },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      Record: {
        type: "object",
        properties: {
          id: { type: "integer", example: 42 },
          amount: { type: "number", example: 5000.0 },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string", example: "salary" },
          date: { type: "string", format: "date", example: "2024-03-01" },
          notes: { type: "string", nullable: true },
          created_by: { type: "integer" },
          created_by_name: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Insufficient permissions for this action",
          },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Forbidden: {
        description: "Insufficient role permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Unprocessable: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Auth ───────────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user",
        description:
          "First call creates an admin automatically. Subsequent calls require an admin Bearer token.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Alice Admin" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  role: {
                    type: "string",
                    enum: ["viewer", "analyst", "admin"],
                    default: "viewer",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: {
            description: "Email already registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          422: { $ref: "#/components/responses/Unprocessable" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and get JWT token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          422: { $ref: "#/components/responses/Unprocessable" },
        },
      },
    },

    // ── Users ──────────────────────────────────────────────────────────────────
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List all active users (admin only)",
        responses: {
          200: {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get own profile",
        responses: {
          200: {
            description: "Own user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "User found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user name, role, or status (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["viewer", "analyst", "admin"],
                  },
                  status: { type: "string", enum: ["active", "inactive"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/Unprocessable" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Soft-delete a user (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "User deleted" },
          400: { description: "Cannot delete yourself" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ── Records ────────────────────────────────────────────────────────────────
    "/records": {
      get: {
        tags: ["Records"],
        summary: "List records with optional filters and pagination (viewer+)",
        parameters: [
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["income", "expense"] },
          },
          { name: "category", in: "query", schema: { type: "string" } },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Start date YYYY-MM-DD",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "End date YYYY-MM-DD",
          },
          { name: "minAmount", in: "query", schema: { type: "number" } },
          { name: "maxAmount", in: "query", schema: { type: "number" } },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search notes/category/type",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: "Paginated list of records",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    records: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Record" },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        pages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Records"],
        summary: "Create a financial record (analyst+)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount", "type", "category", "date"],
                properties: {
                  amount: { type: "number", minimum: 0.01, example: 5000 },
                  type: { type: "string", enum: ["income", "expense"] },
                  category: { type: "string", example: "salary" },
                  date: {
                    type: "string",
                    format: "date",
                    example: "2024-03-01",
                  },
                  notes: { type: "string", maxLength: 500, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Record created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    record: { $ref: "#/components/schemas/Record" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          422: { $ref: "#/components/responses/Unprocessable" },
        },
      },
    },
    "/records/{id}": {
      get: {
        tags: ["Records"],
        summary: "Get a single record (viewer+)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Record found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    record: { $ref: "#/components/schemas/Record" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Records"],
        summary: "Update a record — analyst (own only) or admin (any)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "number", minimum: 0.01 },
                  type: { type: "string", enum: ["income", "expense"] },
                  category: { type: "string" },
                  date: { type: "string", format: "date" },
                  notes: { type: "string", maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Record updated" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/Unprocessable" },
        },
      },
      delete: {
        tags: ["Records"],
        summary: "Soft-delete a record (admin only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: { description: "Record deleted" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ── Dashboard ──────────────────────────────────────────────────────────────
    "/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Total income, expenses, net balance (viewer+)",
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: {
            description: "Financial summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    summary: {
                      type: "object",
                      properties: {
                        totalIncome: { type: "number" },
                        totalExpenses: { type: "number" },
                        netBalance: { type: "number" },
                        recordCount: { type: "integer" },
                        period: {
                          type: "object",
                          properties: {
                            from: { type: "string", nullable: true },
                            to: { type: "string", nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/dashboard/by-category": {
      get: {
        tags: ["Dashboard"],
        summary: "Income and expense totals grouped by category (viewer+)",
        parameters: [
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "Category breakdown" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/dashboard/trends": {
      get: {
        tags: ["Dashboard"],
        summary: "Monthly or weekly income/expense trends (analyst+)",
        parameters: [
          {
            name: "period",
            in: "query",
            schema: {
              type: "string",
              enum: ["monthly", "weekly"],
              default: "monthly",
            },
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          200: { description: "Trend data" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/dashboard/recent": {
      get: {
        tags: ["Dashboard"],
        summary: "Most recently created records (viewer+)",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 50 },
          },
        ],
        responses: {
          200: { description: "Recent records" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
};

module.exports = { swaggerUi, spec };
