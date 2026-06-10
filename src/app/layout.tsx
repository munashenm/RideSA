import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Analytics } from "@/components/Analytics";
import { getSessionUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/site-url";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "VayaSA — Ride sharing & passenger transport",
    template: "%s | VayaSA",
  },
  description:
    "South Africa's ride sharing and passenger transport marketplace. Book ride shares, bus tickets, and taxi seats with verified drivers across JHB, Cape Town, Durban, Polokwane and more.",
  keywords: [
    "ride sharing South Africa",
    "bus tickets SA",
    "taxi bookings",
    "intercity transport",
    "women only rides",
    "verified drivers",
    "VayaSA",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: appUrl,
    siteName: "VayaSA",
    title: "VayaSA — Ride sharing & passenger transport",
    description:
      "Book ride shares, bus tickets, and taxi departures across South Africa. Verified drivers, women-only rides, secure Paystack payments.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VayaSA",
    description: "Ride sharing, bus tickets & taxi bookings across South Africa",
  },
  alternates: {
    canonical: appUrl,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en-ZA">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`}>
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <MobileNav />
        <Analytics />
      </body>
    </html>
  );
}
