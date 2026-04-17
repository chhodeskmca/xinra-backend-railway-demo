# Xinra Backend

Production-ready JavaScript backend for login-only auth, role-based user creation, dashboard stats, venue QR lookups, tip/review submission, standard API responses, and API docs.

## Setup

1. Create `.env` from `.env.example` and set real values.
2. Install dependencies:

```bash
npm install
```

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Apply migrations:

```bash
npm run prisma:deploy
```

5. Seed the admin:

```bash
npm run seed
```

6. Start the API:

```bash
npm start
```

## Routes

- `POST /api/v1/auth/login`
- `GET /api/v1/stats/dashboard`
- `POST /api/v1/tip-reviews`
- `GET /api/v1/venues`
- `POST /api/v1/venues`
- `GET /api/v1/venues/qr/:qrToken`
- `GET /api/v1/venues/:venueId`
- `PATCH /api/v1/venues/:venueId`
- `DELETE /api/v1/venues/:venueId`
- `GET /api/v1/staff`
- `POST /api/v1/staff`
- `GET /api/v1/staff/:staffId`
- `PATCH /api/v1/staff/:staffId`
- `DELETE /api/v1/staff/:staffId`
- `POST /api/v1/staff/:staffId/venues`
- `POST /api/v1/users/venue-admin`
- `POST /api/v1/users/venue-admin/:venueAdminId/venues`
- `POST /api/v1/users/staff`
- `POST /api/v1/users/staff/:staffId/venues`
- `GET /api-docs`
- `GET /docs`

Implementation notes for the TipReview flow live in [docs/tip-review-flow.md](docs/tip-review-flow.md).
