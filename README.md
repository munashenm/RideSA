# VayaSA

South Africa's intercity ridesharing and parcel delivery platform — planned travel between cities, not a taxi app. Built as a BlaBlaCar-style MVP with parcel sharing, SA-specific safety, and Paystack payments.

**Production:** [https://www.vayasa.co.za](https://www.vayasa.co.za)

## Features

### Authentication
- Register/login with role selection (passenger, driver, parcel sender)
- User profile with email demo-verify and SMS OTP phone verification
- Admin role for platform management

### Driver Module
- Driver application with real document uploads (ID, license, license disk, vehicle photos, selfie)
- Admin approval required before posting trips
- Create trips with seats, parcel space, pricing, pickup/drop-off points
- Accept/reject passenger and parcel requests
- Update trip status (scheduled → in transit → completed)
- Earnings dashboard

### Passenger Module
- Search trips with filters (route, date, price, seats, driver rating)
- Book seats with driver acceptance flow
- Pay booking fee via Paystack (card & EFT); demo methods for testing
- Chat with driver after payment
- Track trip status, rate driver, SOS & trip sharing

### Parcel Delivery
- Send parcels on existing driver trips
- Parcel details: type, size, weight, contacts, photos
- Match to drivers on route
- Status tracking: requested → accepted → collected → in transit → delivered
- Proof of delivery upload by driver

### Safety
- Verified driver badge
- Trip sharing link (`/trip/[token]`)
- Emergency SOS button
- Ratings & reviews
- Report user & admin dispute management

### Admin Dashboard
- Approve/reject drivers
- View users, trips, bookings, parcels
- Manage disputes & reports
- Suspend users
- Analytics: trips, revenue, commission, popular routes

### Payments
- **Paystack** (ZAR) — redirect checkout + webhook; chat unlocks after confirmed payment
- Ozow / card / EFT demo methods when Paystack keys are not set
- 10% platform commission (configurable)

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma** + PostgreSQL
- **bcryptjs** for password hashing
- **Railway** (hosting) + **Cloudflare** (DNS for vayasa.co.za)

## Getting Started (local)

### 1. PostgreSQL

```bash
docker compose up -d
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env — set SESSION_SECRET; optional PAYSTACK_* and TWILIO_* keys
```

### 3. App

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Paystack keys, payments complete in **demo mode** (instant). With test keys from [Paystack](https://dashboard.paystack.com), checkout redirects to Paystack sandbox.

## Production (Railway + www.vayasa.co.za)

### Railway environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` or `sk_live_…` |
| `PAYSTACK_PUBLIC_KEY` | `pk_test_…` or `pk_live_…` |
| `NEXT_PUBLIC_APP_URL` | `https://www.vayasa.co.za` |
| `EMAIL_FROM` | `VayaSA <noreply@vayasa.co.za>` |
| `ADMIN_ALERT_EMAIL` | `admin@vayasa.co.za` |

Paystack webhook URL:

`https://www.vayasa.co.za/api/payments/paystack/webhook`

Event: **charge.success**

### Custom domain (Cloudflare DNS → Railway)

1. In **Railway** → your web service → **Settings** → **Networking** → **Custom Domain**, add:
   - `www.vayasa.co.za`
   - `vayasa.co.za` (optional apex redirect)
2. Railway shows a CNAME target (e.g. `your-app.up.railway.app`).
3. In **Cloudflare** DNS for `vayasa.co.za`:
   - **CNAME** `www` → Railway hostname (proxy on/orange cloud is fine)
   - **CNAME** or redirect `@` → `www.vayasa.co.za` if you want apex → www
4. SSL: Cloudflare **Full** or **Full (strict)**; Railway terminates HTTPS on the custom domain.
5. Redeploy after setting `NEXT_PUBLIC_APP_URL=https://www.vayasa.co.za`.

**Note:** Existing production DB may still have `admin@ridesa.co.za`. Either log in with that account or update the user email in the database / re-seed.

### Optional production services

| Service | Env vars | Purpose |
|---------|----------|---------|
| **Resend** | `RESEND_API_KEY`, `EMAIL_FROM` | Email verification links |
| **Twilio** | `TWILIO_*` | SMS OTP |
| **Cloudflare R2** | `S3_*` | Persistent driver document uploads |
| **Plausible** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics (`vayasa.co.za`) |

Apex host `vayasa.co.za` redirects to `www.vayasa.co.za` automatically.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | demo@example.com | password123 |
| Driver (approved) | thabo@example.com | password123 |
| Admin | admin@vayasa.co.za | password123 |

## Popular Routes (seeded)

- Johannesburg → Polokwane, Durban, Cape Town, Musina
- Pretoria → Polokwane, Mbombela
- Polokwane → Musina
- Durban → Cape Town
- Cape Town → George

## Project Structure

```
src/
├── app/
│   ├── api/           # REST API (auth, rides, parcels, payments, admin, safety)
│   ├── search/        # Find a ride
│   ├── parcel/        # Send a parcel
│   ├── publish/       # Post a trip (drivers)
│   ├── bookings/      # My bookings
│   ├── admin/         # Admin dashboard
│   ├── driver/apply/  # Driver application
│   ├── trip/[token]/  # Trip sharing
│   └── profile/       # User profile
├── components/        # UI components
└── lib/               # Auth, payments, constants, utilities
prisma/
├── schema.prisma
└── seed.ts
```

## Roadmap

- Paystack live keys + Ozow integration
- PEP store COD partnership (parcel pickup/drop-off)
- SA ID verification API
- Push notifications
- React Native mobile app
- AI fraud detection
- Cash booking & Capitec Pay
