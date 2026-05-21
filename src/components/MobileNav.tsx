"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Ticket, Package, User, Car } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/bookings", label: "Bookings", icon: Ticket },
  { href: "/parcel", label: "Parcels", icon: Package },
  { href: "/publish", label: "Drive", icon: Car },
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
