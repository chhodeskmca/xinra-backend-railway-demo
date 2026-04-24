# Xinra Backend

Xinra is a QR-based tipping and staff recognition backend for hospitality venues. Customers can scan a venue QR code, choose a staff member, and submit a tip, a review, or both without installing an app. The API also supports role-based management for admins, venue admins, staff assignments, venue access, and dashboard stats.

This service is built with Node.js, Express, Prisma, and PostgreSQL, and is designed to run well in local development and on Railway.

## Overview

The backend currently provides:

- JWT-based authentication
- role-based access control for `ADMIN`, `VENUE_ADMIN`, and `STAFF`
- venue CRUD with QR token generation
- venue-admin and staff assignment flows
- tip and review submission
- dashboard stats by logged-in role
- OpenAPI docs via Swagger UI and Scalar

Stripe payout support is scaffolded in the codebase but is not fully active yet. The current implementation records tip transactions and reviews in the database, while the Stripe helper remains a placeholder for future activation.

## Tech Stack

- Node.js `>=20`
- Express.js
- Prisma ORM
- PostgreSQL
- Zod for request validation
- JWT for auth
- Railway for deployment

## Requirements

Before running the project locally, make sure you have:

- Node.js `20+`
- npm
- PostgreSQL

## Environment Variables

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Important variables:

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | App environment. Defaults to `development`. |
| `PORT` | No | API port. Defaults to `3000`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | Yes | Secret used to sign auth tokens. Use a long random value in production. |
| `JWT_EXPIRES_IN` | No | JWT expiry window. Defaults to `1h`. |
| `BCRYPT_SALT_ROUNDS` | No | Password hashing cost. Defaults to `12`. |
| `FRONTEND_BASE_URL` | No | Used when building QR scan URLs for venues. |
| `ADMIN_NAME` | Yes for seed | Seeded admin display name. |
| `ADMIN_EMAIL` | Yes for seed | Seeded admin email. |
| `ADMIN_PASSWORD` | Yes for seed | Seeded admin password. Must be at least 8 characters. |
| `CORS_ORIGIN` | No | Comma-separated allowed origins. Leave empty to use default CORS behavior. |

Optional future Stripe placeholders already exist in `.env.example`, but they are not required for the current flow.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create and configure `.env`:

```bash
cp .env.example .env
```

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Apply migrations:

```bash
npm run prisma:deploy
```

5. Seed the initial admin user:

```bash
npm run seed
```

6. Start the API in development:

```bash
npm run dev
```

7. For a production-style local start:

```bash
npm start
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the API with `nodemon`. |
| `npm start` | Start the API with Node.js. |
| `npm run check` | Run syntax validation across `src` and `prisma`. |
| `npm run prisma:generate` | Generate Prisma client. |
| `npm run prisma:migrate` | Run Prisma development migration flow. |
| `npm run prisma:deploy` | Apply committed migrations. |
| `npm run seed` | Seed or update the default admin user. |

## Seed Behavior

The seed script creates or updates one `ADMIN` user using:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Backward-compatible `SUPER_ADMIN_*` variables are also supported as fallback inputs.

## API Docs

Once the server is running, API docs are available at:

- Swagger UI: `/api-docs`
- Scalar: `/docs`

## Authentication and Roles

The API uses bearer JWT tokens. After login, protected routes expect:

```http
Authorization: Bearer <token>
```

Supported roles:

- `ADMIN`: full platform management
- `VENUE_ADMIN`: manages assigned venues and related staff
- `STAFF`: receives tips, reviews, and personal dashboard stats

## Route Summary

### Auth

- `POST /api/v1/auth/login`

### Stats

- `GET /api/v1/stats/dashboard`

### Tip Reviews

- `POST /api/v1/tip-reviews`

### Venues

- `GET /api/v1/venues`
- `POST /api/v1/venues`
- `GET /api/v1/venues/qr/:qrToken`
- `GET /api/v1/venues/:venueId`
- `PATCH /api/v1/venues/:venueId`
- `DELETE /api/v1/venues/:venueId`

### Staff

- `GET /api/v1/staff`
- `POST /api/v1/staff`
- `GET /api/v1/staff/:staffId`
- `PATCH /api/v1/staff/:staffId`
- `DELETE /api/v1/staff/:staffId`
- `POST /api/v1/staff/:staffId/venues`

### Users

- `POST /api/v1/users/venue-admin`
- `POST /api/v1/users/venue-admin/:venueAdminId/venues`
- `POST /api/v1/users/staff`
- `POST /api/v1/users/staff/:staffId/venues`

### Documentation

- `GET /api-docs`
- `GET /docs`

## Project Structure

```text
xinra-backend-railway/
├── docs/
│   └── tip-review-flow.md
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── docs/
│   │   ├── scalar.js
│   │   └── swagger.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── staff/
│   │   ├── stats/
│   │   ├── tipReview/
│   │   ├── user/
│   │   └── venue/
│   ├── shared/
│   │   ├── constants/
│   │   ├── integrations/
│   │   ├── middleware/
│   │   └── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Directory Guide

### `src/modules`

Feature-based modules. Each module follows the same pattern:

- `*.routes.js`: Express routes
- `*.controller.js`: request/response layer
- `*.service.js`: business logic and Prisma access

Current modules:

- `auth`: login and token issuance
- `venue`: venue creation, listing, updates, QR lookup
- `staff`: staff CRUD and venue assignments
- `user`: role-based helper endpoints for creating venue admins and compatibility staff flows
- `tipReview`: public tip/review submission flow
- `stats`: role-aware dashboard summary endpoint

### `src/shared`

Cross-cutting building blocks used across modules:

- `constants`: roles and HTTP status codes
- `middleware`: auth, role checks, and centralized error handling
- `utils`: JWT, hashing, validation, QR helpers, API response helpers, venue access helpers
- `integrations`: external service helpers such as the future Stripe integration scaffold

### `src/config`

Runtime configuration:

- `env.js`: environment parsing and defaults
- `db.js`: Prisma client initialization

### `prisma`

Database layer:

- `schema.prisma`: schema definition
- `migrations/`: committed database migrations
- `seed.js`: admin seed script

### `docs`

Project-specific implementation notes that sit outside the runtime app. Right now it includes the tip/review business flow reference.

## Request Lifecycle

In most modules, requests follow this flow:

1. Route applies authentication and role checks.
2. Controller forwards sanitized input to the service layer.
3. Service validates input with Zod and performs Prisma operations.
4. Standard response helpers return the API envelope.

This keeps routing thin and business logic centralized in services.

## Deployment Notes

This project is suitable for Railway deployment.

Important behavior from `package.json`:

- `postinstall` runs:

```bash
prisma generate && prisma migrate deploy && node prisma/seed.js
```

That means Railway deployments will automatically:

- generate Prisma client
- apply committed migrations
- seed or update the default admin user

Make sure production environment variables are configured before deployment, especially:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Operational Notes

- Prisma logs warnings and errors in development, and errors only outside development.
- Graceful shutdown is implemented for `SIGTERM`, `SIGINT`, unhandled promise rejections, and uncaught exceptions.
- QR scan URLs depend on `FRONTEND_BASE_URL`.
- Dashboard stats are role-aware and exposed through a single endpoint.

## Current Payment Status

The current tip flow stores transactions in the database and is ready for reporting and future payout integration. Stripe client activation and webhook verification are not yet enabled in the running implementation.

## Additional Documentation

- Tip/review flow notes: [docs/tip-review-flow.md](docs/tip-review-flow.md)
