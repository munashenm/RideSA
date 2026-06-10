"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Route,
  PlusCircle,
  ClipboardList,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  LayoutDashboard,
  Wallet,
  Clock,
  AlertCircle,
  Bus,
  Car,
} from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import {
  isApprovedDriver,
  isPendingDriver,
  isRejectedDriver,
  isApprovedBusOperator,
  isApprovedTaxiOperator,
  isPendingBusOperator,
  isPendingTaxiOperator,
  isBusOperator,
  isTaxiOperator,
  isAdminUser,
} from "@/lib/user-permissions";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: SessionUser | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const approvedDriver = user && isApprovedDriver(user);
  const pendingDriver = user && isPendingDriver(user);
  const rejectedDriver = user && isRejectedDriver(user);
  const approvedBusOperator = user && isApprovedBusOperator(user);
  const pendingBusOperator = user && isPendingBusOperator(user);
  const approvedTaxiOperator = user && isApprovedTaxiOperator(user);
  const pendingTaxiOperator = user && isPendingTaxiOperator(user);
  const busOperator = user && isBusOperator(user);
  const taxiOperator = user && isTaxiOperator(user);
  const admin = user && isAdminUser(user);

  const passengerLinks = [
    { href: "/search", label: "Ride Sharing", icon: Route },
    { href: "/search/buses", label: "Bus Tickets", icon: Bus },
    { href: "/search/taxis", label: "Taxi Bookings", icon: Car },
    { href: "/bookings", label: "My Bookings", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const driverLinks = approvedDriver
    ? [
        { href: "/publish", label: "Post a Trip", icon: PlusCircle },
        { href: "/driver/dashboard", label: "Driver Dashboard", icon: LayoutDashboard },
        { href: "/driver/earnings", label: "Earnings", icon: Wallet },
      ]
    : [];

  const verificationLink = pendingDriver
    ? [{ href: "/driver/apply", label: "Verification Pending", icon: Clock }]
    : rejectedDriver
      ? [{ href: "/driver/apply", label: "Resubmit Verification", icon: AlertCircle }]
      : user && !approvedDriver && !busOperator && !taxiOperator
        ? [{ href: "/driver/apply", label: "Become a Driver", icon: PlusCircle }]
        : [];

  const operatorLinks = [
    ...(busOperator
      ? [{
          href: approvedBusOperator ? "/operator/bus/dashboard" : "/operator/bus/apply",
          label: pendingBusOperator ? "Bus verification pending" : "Bus Operator",
          icon: Bus,
        }]
      : []),
    ...(taxiOperator
      ? [{
          href: approvedTaxiOperator ? "/operator/taxi/dashboard" : "/operator/taxi/apply",
          label: pendingTaxiOperator ? "Taxi verification pending" : "Taxi Operator",
          icon: Car,
        }]
      : []),
  ];

  const adminLinks = admin ? [{ href: "/admin", label: "Admin", icon: Shield }] : [];

  const navLinks = [
    ...passengerLinks,
    ...driverLinks,
    ...verificationLink,
    ...operatorLinks,
    ...adminLinks,
  ];

  const mobilePrimary = [
    passengerLinks[0],
    passengerLinks[1],
    passengerLinks[2],
    passengerLinks[3],
    passengerLinks[4],
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-sm">
              <Route className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Vaya<span className="text-brand-600">SA</span>
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-1 flex-wrap justify-end max-w-3xl">
            {navLinks.map((link) => (
              <NavLink key={link.href + link.label} link={link} pathname={pathname} />
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-3 shrink-0">
            {user ? (
              <>
                <span className="text-sm text-muted hidden 2xl:inline">{user.name.split(" ")[0]}</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  Log in
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-hero shadow-sm hover:opacity-90">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            className="xl:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="xl:hidden border-t bg-white px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium",
                  pathname === link.href ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            {user ? <LogoutButton mobile /> : (
              <>
                <Link href="/login" className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>Log in</Link>
                <Link href="/register" className="block px-4 py-3 rounded-lg text-sm font-medium text-white gradient-hero text-center" onClick={() => setMobileOpen(false)}>Sign up</Link>
              </>
            )}
          </div>
        )}
      </header>

      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around py-2">
          {mobilePrimary.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-medium min-w-0",
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-brand-600"
                  : "text-gray-500"
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              <span className="truncate max-w-[64px]">{link.label.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function NavLink({
  link,
  pathname,
}: {
  link: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  pathname: string;
}) {
  const active = pathname === link.href || pathname.startsWith(link.href + "/");
  return (
    <Link
      href={link.href}
      className={cn(
        "px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
        active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <link.icon className="w-3.5 h-3.5" />
      {link.label}
    </Link>
  );
}

function LogoutButton({ mobile }: { mobile?: boolean }) {
  async function handleLogout() {
    await fetch("/api/auth/session", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700",
        mobile ? "px-4 py-3 w-full" : "px-3 py-2 rounded-lg hover:bg-gray-100"
      )}
    >
      <LogOut className="w-4 h-4" />
      {mobile && "Log out"}
    </button>
  );
}
