# RideSA

South Africa's intercity ridesharing and parcel delivery platform — planned travel between cities, not a taxi app. Built as a BlaBlaCar-style MVP with parcel sharing, SA-specific safety, and local payment placeholders.

## Features

### Authentication
- Register/login with role selection (passenger, driver, parcel sender)
- User profile with verification placeholders (email, phone, ID)
- Admin role for platform management

### Driver Module
- Driver application with document upload placeholders (ID, license, license disk, vehicle photos, selfie)
- Admin approval required before posting trips
- Create trips with seats, parcel space, pricing, pickup/drop-off points
- Accept/reject passenger and parcel requests
- Update trip status (scheduled → in transit → completed)
- Earnings dashboard

### Passenger Module
- Search trips with filters (route, date, price, seats, driver rating)
- Book seats with driver acceptance flow
- Pay booking fee (PayFast, Ozow, card, EFT placeholders)
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
- Placeholder integrations: PayFast, Ozow EFT, card, EFT
- Chat unlocks only after successful payment
- 10% platform commission (configurable)

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Prisma** + PostgreSQL (SQLite for local dev via Docker optional)
- **bcryptjs** for password hashing

## Getting Started

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Passenger | demo@example.com | password123 |
| Driver (approved) | thabo@example.com | password123 |
| Admin | admin@ridesa.co.za | password123 |

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

- PayFast / Ozow live integration
- SA ID verification API
- Push notifications
- React Native mobile app
- AI fraud detection
- Cash booking & Capitec Pay
