# VayaSA

South Africa's ride sharing and passenger transport marketplace — book ride shares, bus tickets, and taxi seats between cities. Built with SA-specific safety, verified drivers, and Paystack payments.

**Production:** [https://www.vayasa.co.za](https://www.vayasa.co.za)

## Features

### Authentication & roles
- Register/login with role selection: **Passenger**, **Driver**, **Bus Operator**, **Taxi Operator**
- Admin role for platform management
- Email verification, SMS OTP, and **SA ID verification** (VerifyID)

### Passenger
- Search **ride sharing**, **bus tickets**, and **taxi departures**
- Book seats with Paystack, Ozow, Capitec Pay, or **cash at rank**
- Digital tickets with QR codes (bus & taxi)
- Women-only ride filter and female-driver search
- Chat with driver after payment (ride shares)
- Trip sharing, SOS, ratings & reviews
- In-app notifications and optional web push

### Driver
- **SA ID verification** required before applying
- Driver application with document uploads (ID, license, license disk, vehicle photos, selfie)
- Admin approval required before posting trips
- Vehicle management, earnings & bank payouts

### Bus & Taxi Operators
- Operator onboarding with company/permit verification
- Dashboards for routes, schedules, bookings, check-in, and payouts

### Admin Dashboard
- Approve drivers, operators, and **ID verifications**
- Bus/taxi booking management, refunds, payouts
- **System** tab — production readiness checklist (R2, Resend, Twilio, Paystack)

### Payments
- **Paystack** (ZAR) — redirect checkout + webhook
- **Ozow** instant EFT + webhook signature verification
- **Capitec Pay** redirect (when configured)
- **Cash at rank** — pay at terminal, collected at operator check-in
- Automated refunds on cancellation (Paystack + admin retry)

## Tech Stack

- **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS 4**
- **Prisma** + PostgreSQL
- **Railway** (hosting) + **Cloudflare** (DNS + R2 storage)

## Getting Started (local)

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without payment keys, checkout runs in **demo mode**.

## Production deployment

### Pre-flight check

```bash
npm run check:production
```

Or open **Admin → System** after deploy. Fix any **error** items before going live.

Health probe: `GET /api/health?detailed=1`

### Required Railway variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://…`) |
| `SESSION_SECRET` | Long random string (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | `https://www.vayasa.co.za` |
| `PAYSTACK_SECRET_KEY` | `sk_live_…` (or `sk_test_…` for staging) |
| `PAYSTACK_PUBLIC_KEY` | Matching public key |
| `S3_BUCKET` | R2 bucket name |
| `S3_ACCESS_KEY_ID` | R2 API token ID |
| `S3_SECRET_ACCESS_KEY` | R2 API token secret |
| `S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` |
| `S3_PUBLIC_URL` | Public bucket URL or custom domain |
| `S3_REGION` | `auto` for R2 |

Without `S3_*`, document uploads **fail in production** (local disk is not persistent on Railway).

### Recommended services

| Service | Env vars | Purpose |
|---------|----------|---------|
| **Resend** | `RESEND_API_KEY`, `EMAIL_FROM` | Email verification & notifications |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS OTP |
| **VerifyID** | `VERIFYID_API_KEY` | Live SA ID verification |
| **Ozow** | `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY` | Instant EFT |
| **Capitec** | `CAPITEC_MERCHANT_ID`, `CAPITEC_API_KEY` | Capitec Pay |
| **Web push** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Browser push (`npx web-push generate-vapid-keys`) |
| **Plausible** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics |

### Webhooks

| Provider | URL | Event |
|----------|-----|-------|
| Paystack | `https://www.vayasa.co.za/api/payments/paystack/webhook` | `charge.success` |
| Ozow | `https://www.vayasa.co.za/api/payments/ozow/webhook` | Payment notification (POST) |

### Cloudflare R2 (document uploads)

1. Create an R2 bucket in Cloudflare dashboard.
2. Enable public access or attach a custom domain → set `S3_PUBLIC_URL`.
3. Create API token with read/write on the bucket.
4. Set all `S3_*` variables in Railway and redeploy.
5. Confirm **Admin → System** shows uploads as **ok**.

### Custom domain (Cloudflare → Railway)

1. Railway → **Networking** → add `www.vayasa.co.za` (and apex if needed).
2. Cloudflare DNS: **CNAME** `www` → Railway hostname.
3. SSL: Cloudflare **Full (strict)**.
4. Set `NEXT_PUBLIC_APP_URL=https://www.vayasa.co.za` and redeploy.

### Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Passenger | demo@example.com | password123 |
| Driver | thabo@example.com | password123 |
| Bus operator | bus@vayasa.co.za | password123 |
| Taxi operator | taxi@vayasa.co.za | password123 |
| Admin | admin@vayasa.co.za | password123 |

## Project Structure

```
src/
├── app/api/          # REST API
├── app/admin/        # Admin dashboard (+ System readiness tab)
├── app/notifications/
├── app/ticket/       # Digital tickets (QR)
├── components/
└── lib/              # payments, refunds, id-verification, production-readiness
prisma/schema.prisma
scripts/check-production.ts
```

## Roadmap

- React Native mobile app
- AI fraud detection
- Paystack live keys rollout (staging → production)
