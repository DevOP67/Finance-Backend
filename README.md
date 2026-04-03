# Finance Dashboard API

A production-ready REST API for managing financial records, built with **Node.js**, **Express**, and **PostgreSQL**. Features role-based access control, dashboard analytics, JWT authentication, rate limiting, Swagger docs, and a clean controller/service architecture.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Access Control](#access-control)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Security](#security)
- [Project Structure](#project-structure)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# 3. Create tables
npm run migrate

# 4. Start the server
npm start
# → http://localhost:3000
# → Swagger docs: http://localhost:3000/api/docs
```

---

## Architecture

```
Request → Route (validation) → Controller (req/res) → Service (business logic) → DB
                                                   ↓
                                          errorHandler (centralized)
```

| Layer | Responsibility |
|---|---|
| **Routes** | Validation rules, middleware wiring, no logic |
| **Controllers** | Parse request, call service, send response, call `next(err)` |
| **Services** | All business logic, DB queries, throws `AppError` on failure |
| **Middleware** | Auth, RBAC, rate limiting, validation, error handling |

---

## Environment Variables

Copy `.env.example` to `.env`. The server **will not start** unless both required vars are set.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Long random secret for signing tokens |
| `PORT` | optional | Server port (default: `3000`) |
| `NODE_ENV` | optional | `production` enables pg SSL |

**Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**DATABASE_URL format:**
```
postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

---

## Database Setup

```bash
# Run once — creates all tables and indexes
npm run migrate
```

### Schema overview

**`users`** — id, name, email, password_hash, role (viewer/analyst/admin), status (active/inactive), created_at, updated_at, deleted_at

**`records`** — id, amount, type (income/expense), category, date, notes, created_by (→ users.id), created_at, updated_at, deleted_at

Both tables use **soft deletes** (`deleted_at` timestamp). Hard deletes never occur.

---

## API Reference

Base URL: `/api`  
Interactive docs: `GET /api/docs`  
All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

---

### Auth

#### `POST /api/auth/register`
Register a user. The **first call** automatically creates an admin. All subsequent calls require an admin token.

**Body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "viewer"
}
```
`role` — `viewer` | `analyst` | `admin` (default: `viewer`)

**Response `201`:**
```json
{ "user": { "id": 1, "name": "Alice", "role": "admin", ... }, "token": "eyJ..." }
```

---

#### `POST /api/auth/login`
**Body:** `{ "email": "...", "password": "..." }`  
**Response `200`:** `{ "user": {...}, "token": "eyJ..." }`

Tokens expire in **24 hours**. Both auth endpoints are rate-limited to **20 requests per 15 minutes**.

---

### Users *(admin only)*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all active users |
| `GET` | `/api/users/me` | Own profile (any role) |
| `GET` | `/api/users/:id` | Get user by ID |
| `PATCH` | `/api/users/:id` | Update name, role, or status |
| `DELETE` | `/api/users/:id` | Soft-delete user |

**PATCH body** (all fields optional):
```json
{ "name": "Bob", "role": "analyst", "status": "inactive" }
```

---

### Records

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/records` | viewer | List with filters + pagination |
| `GET` | `/api/records/:id` | viewer | Single record |
| `POST` | `/api/records` | analyst | Create record |
| `PUT` | `/api/records/:id` | analyst | Update (own) / admin (any) |
| `DELETE` | `/api/records/:id` | admin | Soft-delete |

**POST/PUT body:**
```json
{
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2024-03-01",
  "notes": "March salary"
}
```

**Valid categories:** `salary`, `freelance`, `investment`, `rent`, `utilities`, `food`, `transport`, `healthcare`, `entertainment`, `tax`, `insurance`, `loan`, `transfer`, `other`

#### GET /api/records — query parameters

| Param | Type | Description |
|---|---|---|
| `type` | string | `income` or `expense` |
| `category` | string | Any valid category |
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |
| `minAmount` | number | Minimum amount |
| `maxAmount` | number | Maximum amount |
| `search` | string | Search notes, category, type |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 20, max: 100) |

**Response:**
```json
{
  "records": [...],
  "pagination": { "page": 1, "limit": 20, "total": 87, "pages": 5 }
}
```

---

### Dashboard

All dashboard endpoints accept optional `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | viewer | Totals, net balance, savings rate |
| `GET` | `/api/dashboard/by-category` | viewer | Breakdown per category |
| `GET` | `/api/dashboard/top-expenses` | viewer | Top 5 spending categories |
| `GET` | `/api/dashboard/recent` | viewer | Latest N records (`?limit=10`) |
| `GET` | `/api/dashboard/trends` | analyst | Monthly/weekly trends (`?period=monthly`) |

#### Summary response
```json
{
  "summary": {
    "totalIncome": 8000,
    "totalExpenses": 3000,
    "netBalance": 5000,
    "savingsRate": 62.5,
    "recordCount": 10,
    "incomeCount": 4,
    "expenseCount": 6,
    "largestTransaction": 5000,
    "avgTransaction": 800,
    "period": { "from": null, "to": null }
  }
}
```

---

## Access Control

| Action | Viewer | Analyst | Admin |
|---|:---:|:---:|:---:|
| View records | ✅ | ✅ | ✅ |
| View dashboard summary | ✅ | ✅ | ✅ |
| View top expenses | ✅ | ✅ | ✅ |
| View trends | ❌ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ |
| Edit own records | ❌ | ✅ | ✅ |
| Edit any record | ❌ | ❌ | ✅ |
| Delete records | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## Error Handling

All errors follow a consistent shape:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid input or state |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Valid token but insufficient role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate email or unique constraint |
| 422 | `VALIDATION` | express-validator errors |
| 429 | — | Rate limit exceeded |
| 500 | `SERVER_ERROR` | Unexpected server error |

Validation errors (422) return an `errors` array:
```json
{
  "errors": [
    { "field": "amount", "message": "Amount must be > 0" }
  ]
}
```

---

## Testing

```bash
# Run all unit tests
npm test

# Watch mode during development
npm run test:watch
```

Tests use **Jest** with mocked database calls — no live database required.

```
PASS tests/errorHandler.test.js    — AppError, errorHandler middleware (8 tests)
PASS tests/dashboardService.test.js — getSummary, getByCategory, getTrends (5 tests)
PASS tests/recordService.test.js   — listRecords, getOne, update, softDelete (8 tests)

Tests: 21 passed
```

---

## Security

| Measure | Detail |
|---|---|
| **Helmet** | Sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate limiting** | 200 req/15 min globally; 20 req/15 min on `/auth/*` |
| **JWT** | HS256, 24h expiry, secret required at startup |
| **Bcrypt** | Password hashing with cost factor 10 |
| **Parameterised queries** | All SQL uses `$1/$2` placeholders — no string interpolation |
| **Body size cap** | `express.json({ limit: "50kb" })` |
| **Soft deletes** | Data is never hard-deleted; `deleted_at` is set |
| **Env guard** | Server crashes immediately if `JWT_SECRET` or `DATABASE_URL` are missing |

---

## Project Structure

```
finance-api/
├── migrations/
│   └── 001_init.sql           # Schema — run once via npm run migrate
├── src/
│   ├── app.js                 # Express setup, middleware, route mounting
│   ├── db.js                  # pg Pool, query(), queryOne()
│   ├── swagger.js             # OpenAPI 3.0 spec
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── recordController.js
│   │   └── dashboardController.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── recordService.js
│   │   └── dashboardService.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authenticate + requireRole()
│   │   ├── errorHandler.js    # AppError class + centralized handler
│   │   ├── rateLimit.js       # globalLimiter + authLimiter
│   │   └── validate.js        # express-validator error formatter
│   └── routes/
│       ├── users.js
│       ├── records.js
│       └── dashboard.js
├── tests/
│   ├── errorHandler.test.js
│   ├── dashboardService.test.js
│   └── recordService.test.js
├── migrate.js                 # Programmatic migration runner
├── .env.example
├── .gitignore
└── package.json
```
