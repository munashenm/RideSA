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
    default: "VayaSA — Intercity rides & parcel delivery",
    template: "%s | VayaSA",
  },
  description:
    "Book seats on planned intercity trips across South Africa or send parcels with verified drivers. JHB, Cape Town, Durban, Polokwane and more.",
  keywords: [
    "intercity rides South Africa",
    "rideshare SA",
    "send parcel between cities",
    "carpool Johannesburg Cape Town",
    "VayaSA",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: appUrl,
    siteName: "VayaSA",
    title: "VayaSA — Intercity rides & parcel delivery",
    description:
      "Planned intercity travel and parcel sharing — not a taxi app. Verified drivers on N1, N2, N3 routes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VayaSA",
    description: "Intercity rides & parcel delivery across South Africa",
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
