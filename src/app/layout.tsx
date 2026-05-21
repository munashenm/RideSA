import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { getSessionUser } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "RideSA — Intercity rides & parcel delivery",
  description:
    "Share planned intercity trips across South Africa. Book seats or send parcels with verified drivers on routes like JHB to Cape Town, Polokwane, and Durban.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`}>
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <footer className="border-t bg-white py-8 mt-auto hidden lg:block">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted">
            <p className="font-semibold text-gray-800 mb-1">RideSA</p>
            <p>Planned intercity travel & parcel sharing across South Africa</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} RideSA. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
