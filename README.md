# VayaSA

South Africa's ride sharing and passenger transport marketplace — book ride shares, bus tickets, and taxi seats between cities. Built with SA-specific safety, verified drivers, and Paystack payments.

**Production:** [https://www.vayasa.co.za](https://www.vayasa.co.za)

## Features

### Authentication & roles
- Register/login with role selection: **Passenger**, **Driver**, **Bus Operator**, **Taxi Operator**
- Admin role for platform management
- Email verification and SMS OTP phone verification

### Passenger
- Search **ride sharing**, **bus tickets**, and **taxi departures**
- Book seats with secure Paystack payments
- Women-only ride filter and female-driver search
- Chat with driver after payment (ride shares)
- Trip sharing, SOS, ratings & reviews

### Driver
- Driver application with document uploads (ID, license, license disk, vehicle photos, selfie)
- Admin approval required before posting trips
- **Vehicle management** page to update car details after approval
- Post trips, manage bookings, earnings & bank payouts

### Bus Operator
- Operator onboarding with company/permit verification (admin approval)
- Dashboard: add buses, routes, schedules
- Manage ticket bookings and **earnings/payouts**

### Taxi Operator
- Operator onboarding with association/permit verification (admin approval)
- Dashboard: add routes, departure times, seat availability
- Manage bookings and **revenue/payouts**

### Admin Dashboard
- Approve/reject **drivers** and **operators**
- View users, trips, bus/taxi bookings
- Process driver & operator payout requests
- Manage disputes, reports, and platform commission

### Payments
- **Paystack** (ZAR) — redirect checkout + webhook
- Demo Ozow/card/EFT when Paystack keys are not set
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
| **Cloudflare R2** | `S3_*` | Persistent document uploads |
| **Plausible** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics (`vayasa.co.za`) |

Apex host `vayasa.co.za` redirects to `www.vayasa.co.za` automatically.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | demo@example.com | password123 |
| Driver (approved) | thabo@example.com | password123 |
| Bus operator (approved) | bus@vayasa.co.za | password123 |
| Taxi operator (approved) | taxi@vayasa.co.za | password123 |
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
│   ├── api/              # REST API (auth, rides, buses, taxis, payments, admin)
│   ├── search/           # Ride sharing search
│   ├── search/buses/     # Bus ticket search
│   ├── search/taxis/     # Taxi departure search
│   ├── operator/         # Bus & taxi operator dashboards, apply, earnings
│   ├── driver/           # Driver apply, dashboard, earnings, vehicles
│   ├── publish/          # Post a trip (drivers)
│   ├── bookings/         # My bookings (rides, buses, taxis)
│   ├── admin/            # Admin dashboard
│   ├── trip/[token]/     # Trip sharing
│   └── profile/          # User profile
├── components/
└── lib/
prisma/
├── schema.prisma
└── seed.ts
```

## Roadmap

- Paystack live keys + Ozow integration
- SA ID verification API
- Push notifications
- React Native mobile app
- AI fraud detection
- Cash booking & Capitec Pay
