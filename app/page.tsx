"use client";

import Link from "next/link";
import { bookings } from "./lib/data";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 gap-16">

      <div className="text-center space-y-4">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-gold/50" />
          <div className="absolute inset-2 rounded-full border border-gold/25" />
          <span className="font-display text-gold text-4xl font-light select-none">F</span>
        </div>
        <div>
          <p className="font-display text-cream/55 tracking-[0.5em] text-xs">MACHYNYS · MONKS ISLAND</p>
          <h1 className="font-display text-cream tracking-[0.35em] text-3xl mt-2 font-light">LOUNGE MENU</h1>
        </div>
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px bg-gold/45 w-24" />
          <div className="w-1 h-1 bg-gold/60 rotate-45" />
          <div className="h-px bg-gold/45 w-24" />
        </div>
        <p className="font-serif italic text-cream/60 text-base max-w-xs mx-auto">
          Select your table booking below to begin your ordering experience
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {bookings.map((b) => {
          const guestName = [b.guest.first_name, b.guest.last_name].filter(Boolean).join(" ");
          return (
            <Link
              key={b.id}
              href={`/menu?id=${b.id}`}
              className="
                flex items-center justify-between px-5 py-4
                border border-gold/25 hover:border-gold/70
                bg-navy-light hover:bg-navy-border/50
                transition-all duration-200 group
              "
            >
              <div>
                <p className="font-serif text-cream text-base group-hover:text-gold transition-colors font-medium">
                  {guestName}
                </p>
                <p className="text-cream/60 text-sm font-serif mt-0.5">
                  {b.booking_ref} · {b.party_size} {b.party_size === 1 ? "Guest" : "Guests"} · {b.service.name}
                </p>
              </div>
              <span className="text-gold/45 group-hover:text-gold/80 transition-colors font-serif text-lg">›</span>
            </Link>
          );
        })}
      </div>

      <p className="text-cream/45 text-sm font-serif text-center max-w-xs">
        In production, your booking link is sent automatically via SMS.
      </p>
    </div>
  );
}
