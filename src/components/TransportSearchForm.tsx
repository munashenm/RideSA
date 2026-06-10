"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";
import { TRANSPORT_TYPES, type TransportType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Route, Bus, Car } from "lucide-react";

const TABS: { type: TransportType; label: string; href: string; icon: typeof Route }[] = [
  { type: TRANSPORT_TYPES.RIDE, label: "Ride Sharing", href: "/search", icon: Route },
  { type: TRANSPORT_TYPES.BUS, label: "Bus Tickets", href: "/search/buses", icon: Bus },
  { type: TRANSPORT_TYPES.TAXI, label: "Taxi Bookings", href: "/search/taxis", icon: Car },
];

interface TransportSearchFormProps {
  activeType: TransportType;
  compact?: boolean;
  defaultFrom?: string;
  defaultTo?: string;
  defaultDate?: string;
  defaultPassengers?: number;
}

export function TransportSearchForm(props: TransportSearchFormProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ type, label, href, icon: Icon }) => {
          const active = props.activeType === type || pathname === href;
          return (
            <Link
              key={type}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-white text-brand-700 shadow-sm"
                  : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
      <SearchForm
        compact={props.compact}
        defaultFrom={props.defaultFrom}
        defaultTo={props.defaultTo}
        defaultDate={props.defaultDate}
        defaultPassengers={props.defaultPassengers}
        searchPath={
          props.activeType === TRANSPORT_TYPES.BUS
            ? "/search/buses"
            : props.activeType === TRANSPORT_TYPES.TAXI
              ? "/search/taxis"
              : "/search"
        }
      />
    </div>
  );
}
