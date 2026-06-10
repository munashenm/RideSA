"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Ticket, Bus, Car, User } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Rides", icon: Search },
  { href: "/search/buses", label: "Buses", icon: Bus },
  { href: "/search/taxis", label: "Taxis", icon: Car },
  { href: "/bookings", label: "Bookings", icon: Ticket },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-white safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] font-medium px-2",
                active ? "text-brand-600" : "text-gray-500"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
