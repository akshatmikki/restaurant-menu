"use client";

import { useState, useMemo } from "react";
import type { Booking, MenuCategory, MenuItem, MenuItemType } from "../lib/types";
import { MENU_NAME } from "../lib/types";

interface Props {
  booking: Booking;
  menuCategories: MenuCategory[];
}

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  showExtra: boolean;
}

const TYPE_STYLES: Record<MenuItemType, { label: string; cls: string }> = {
  Veg:       { label: "Veg",     cls: "text-emerald-400 border-emerald-400/50" },
  Vegan:     { label: "Vegan",   cls: "text-teal-300 border-teal-300/50" },
  "Non-Veg": { label: "Non-Veg", cls: "text-rose-400 border-rose-400/50" },
};

type OrderState = Record<string, number[]>;

function firstWord(name: string) {
  return name.split(" ")[0] || name;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MenuClient({ booking, menuCategories }: Props) {
  const guestCount = booking.party_size;
  const [phase, setPhase] = useState<"names" | "menu">("names");

  const [guestInfos, setGuestInfos] = useState<GuestInfo[]>(() =>
    Array.from({ length: guestCount }, (_, i) => ({
      name:
        i === 0
          ? [booking.guest.first_name, booking.guest.last_name].filter(Boolean).join(" ")
          : "",
      email: "",
      phone: "",
      showExtra: false,
    })),
  );

  const [order, setOrder] = useState<OrderState>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const resolvedNames = useMemo(
    () => guestInfos.map((g, i) => g.name.trim() || `Guest ${i + 1}`),
    [guestInfos],
  );

  const guestLabel = [booking.guest.first_name, booking.guest.last_name]
    .filter(Boolean)
    .join(" ");

  const canProceed = guestInfos.every((g) => g.name.trim().length > 0);

  function updateGuest(i: number, field: keyof Omit<GuestInfo, "showExtra">, value: string) {
    setGuestInfos((prev) => prev.map((g, j) => (j === i ? { ...g, [field]: value } : g)));
  }

  function toggleExtra(i: number) {
    setGuestInfos((prev) => prev.map((g, j) => (j === i ? { ...g, showExtra: !g.showExtra } : g)));
  }

  function toggleGuestItem(itemId: string, guestNum: number) {
    if (saved) return;
    setOrder((prev) => {
      const cur = prev[itemId] ?? [];
      const has = cur.includes(guestNum);
      return {
        ...prev,
        [itemId]: has
          ? cur.filter((g) => g !== guestNum)
          : [...cur, guestNum].sort((a, b) => a - b),
      };
    });
  }

  const allItems = useMemo(() => menuCategories.flatMap((c) => c.items), [menuCategories]);

  const guestSummaries = useMemo(() => {
    return resolvedNames.map((name, idx) => {
      const guestNum = idx + 1;
      const items: MenuItem[] = [];
      for (const item of allItems) {
        if ((order[String(item.id)] ?? []).includes(guestNum)) items.push(item);
      }
      const total = items.reduce((s, i) => s + parseFloat(i.price), 0);
      return { guestNum, name, items, total };
    });
  }, [order, resolvedNames, allItems]);

  const tableTotal = guestSummaries.reduce((s, g) => s + g.total, 0);
  const hasAnySelection = Object.values(order).some((g) => g.length > 0);

  // ─── Phase: Guest name entry ──────────────────────────────────────────────

  if (phase === "names") {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="text-center mb-10">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full border border-gold/50" />
              <div className="absolute inset-1.5 rounded-full border border-gold/30" />
              <span className="font-display text-gold text-2xl font-light select-none">G</span>
            </div>
            <h1 className="font-display text-cream tracking-[0.3em] text-2xl font-light">
              {MENU_NAME.toUpperCase()}
            </h1>
            <div className="flex items-center gap-3 justify-center mt-3">
              <div className="h-px bg-gold/40 w-16" />
              <div className="w-1 h-1 bg-gold/60 rotate-45" />
              <div className="h-px bg-gold/40 w-16" />
            </div>
          </div>

          <div className="border border-gold/30 bg-navy-light/70 p-6 mb-6">
            <div className="text-center mb-5">
              <p className="text-gold/80 font-serif text-xs tracking-widest uppercase mb-1">
                {booking.booking_ref}
              </p>
              <p className="font-display text-cream text-2xl tracking-wide">{guestLabel || "Guest"}</p>
              <p className="text-cream/70 font-serif text-base mt-1">
                Party of {guestCount}
                {booking.service.name ? ` · ${booking.service.name}` : ""}
              </p>
              {booking.booking_date && (
                <p className="text-cream/55 font-serif text-sm mt-0.5">
                  {formatDate(booking.booking_date)}
                  {booking.booking_time && ` at ${booking.booking_time}`}
                  {booking.tables.length > 0 && ` · Table ${booking.tables[0].name}`}
                </p>
              )}
            </div>

            <div className="h-px bg-gold/25 mb-5" />

            <p className="text-center font-serif italic text-cream/65 text-base mb-6 leading-relaxed">
              Please enter the names of each guest so we can personalise your order
            </p>

            <div className="space-y-6">
              {Array.from({ length: guestCount }, (_, i) => (
                <div key={i} className="space-y-3">
                  {/* Name row */}
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full border border-gold/50 flex items-center justify-center">
                      <span className="font-display text-gold/80 text-xs">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={guestInfos[i].name}
                        onChange={(e) => updateGuest(i, "name", e.target.value)}
                        placeholder="Guest name *"
                        maxLength={40}
                        className="
                          w-full bg-transparent border-b border-gold/35
                          text-cream placeholder:text-cream/40 py-2 font-serif text-base
                          focus:outline-none focus:border-gold/80 transition-colors duration-200
                        "
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExtra(i)}
                      title={guestInfos[i].showExtra ? "Hide details" : "Add email & phone"}
                      className={`
                        shrink-0 w-7 h-7 rounded-full border flex items-center justify-center
                        font-display text-base leading-none transition-all duration-200
                        ${guestInfos[i].showExtra
                          ? "border-gold text-gold bg-gold/15 scale-110"
                          : "border-gold/40 text-gold/60 hover:border-gold/70 hover:text-gold"
                        }
                      `}
                    >
                      {guestInfos[i].showExtra ? "×" : "+"}
                    </button>
                  </div>

                  {/* Expanded: email + phone */}
                  {guestInfos[i].showExtra && (
                    <div className="ml-11 space-y-3">
                      <input
                        type="email"
                        value={guestInfos[i].email}
                        onChange={(e) => updateGuest(i, "email", e.target.value)}
                        placeholder="Email address"
                        maxLength={80}
                        className="
                          w-full bg-transparent border-b border-gold/25
                          text-cream placeholder:text-cream/35 py-1.5 font-serif text-sm
                          focus:outline-none focus:border-gold/60 transition-colors duration-200
                        "
                      />
                      <input
                        type="tel"
                        value={guestInfos[i].phone}
                        onChange={(e) => updateGuest(i, "phone", e.target.value)}
                        placeholder="Phone number"
                        maxLength={20}
                        className="
                          w-full bg-transparent border-b border-gold/25
                          text-cream placeholder:text-cream/35 py-1.5 font-serif text-sm
                          focus:outline-none focus:border-gold/60 transition-colors duration-200
                        "
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPhase("menu")}
            disabled={!canProceed}
            className="
              w-full bg-gold text-navy font-display tracking-[0.3em]
              text-sm py-4 hover:bg-gold-light transition-colors duration-200 font-medium
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            PROCEED TO MENU
          </button>

          <p className="text-center text-cream/45 text-sm font-serif mt-4 italic">
            * Name required · tap + to add email & phone
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase: Menu ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy text-cream">

      {saved && (
        <div className="sticky top-0 z-40 bg-emerald-800/95 border-b border-emerald-400/50 text-center py-3 px-4">
          <p className="font-display tracking-[0.25em] text-emerald-200 text-sm">
            ORDER CONFIRMED — No further changes can be made
          </p>
        </div>
      )}

      <header className={`sticky z-30 bg-navy/98 backdrop-blur-sm border-b border-gold/25 ${saved ? "top-[44px]" : "top-0"}`}>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            {!saved && (
              <button
                type="button"
                onClick={() => setPhase("names")}
                className="text-gold/65 hover:text-gold text-xs font-display tracking-widest transition-colors block"
              >
                ← Edit Names
              </button>
            )}
            <p className="font-display text-cream text-lg tracking-wide mt-0.5 truncate">
              {guestLabel || "Guest"}
              <span className="text-gold/70 ml-2 text-sm font-serif font-normal">· {booking.booking_ref}</span>
            </p>
            <p className="text-cream/60 font-serif text-sm">
              {booking.service.name || MENU_NAME}
              {booking.tables.length > 0 && ` · Table ${booking.tables[0].name}`}
              {booking.booking_time && ` · ${booking.booking_time}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-gold/60 text-xs font-serif">Table Total</p>
            <p className="text-gold font-display text-xl">${tableTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {resolvedNames.map((name, i) => (
            <span
              key={i}
              className="shrink-0 px-3 py-1 rounded-full border border-gold/40 text-gold/85 font-serif text-xs whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </header>

      <div className="text-center pt-10 pb-6 px-4">
        <div className="relative mx-auto w-14 h-14 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border border-gold/40" />
          <div className="absolute inset-1.5 rounded-full border border-gold/20" />
          <span className="font-display text-gold text-xl font-light select-none">G</span>
        </div>
        <h2 className="font-display text-cream tracking-[0.35em] text-2xl font-light">
          {MENU_NAME.toUpperCase()}
        </h2>
        <div className="flex items-center gap-3 justify-center mt-3">
          <div className="h-px bg-gold/45 w-20" />
          <div className="w-1 h-1 bg-gold/65 rotate-45" />
          <div className="h-px bg-gold/45 w-20" />
        </div>
        {!saved && (
          <p className="mt-3 text-cream/60 font-serif italic text-base">
            Tap a name below each dish to add it to that guest&apos;s order
          </p>
        )}
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-52">
        {menuCategories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            resolvedNames={resolvedNames}
            order={order}
            onToggle={toggleGuestItem}
            saved={saved}
          />
        ))}

        <div className="mt-10 border border-gold/25 p-6 text-center space-y-3">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-base font-serif">
            {(Object.entries(TYPE_STYLES) as [MenuItemType, { label: string; cls: string }][]).map(
              ([key, { label, cls }]) => (
                <span key={key} className={`${cls} font-medium`}>
                  {label}
                </span>
              ),
            )}
          </div>
          <div className="h-px bg-gold/20" />
          <p className="text-cream/60 text-sm font-serif max-w-sm mx-auto leading-relaxed">
            If you have any dietary requirements, please advise your server. We cannot 100% guarantee
            that any dish is allergen free.
          </p>
        </div>
      </main>

      {(hasAnySelection || saved) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-navy-light/98 backdrop-blur-sm border-t border-gold/30 shadow-2xl">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-border/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-display tracking-[0.2em] text-gold text-sm">ORDER SUMMARY</span>
              {saved && (
                <span className="text-emerald-300 font-serif text-xs border border-emerald-400/50 px-2 py-0.5 rounded-full">
                  Confirmed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-display text-gold text-base">${tableTotal.toFixed(2)}</span>
              <span className="text-gold/60 text-xs">{summaryOpen ? "▼" : "▲"}</span>
            </div>
          </button>

          {summaryOpen && (
            <div className="max-h-80 overflow-y-auto divide-y divide-gold/15 px-5 pb-6">
              {guestSummaries.filter((g) => g.items.length > 0).map(({ guestNum, name, items, total }) => (
                <div key={guestNum} className="py-4">
                  <p className="font-display tracking-[0.15em] text-gold text-xs mb-3 uppercase">{name}</p>
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-baseline text-base font-serif py-0.5">
                      <span className="italic text-cream/85 truncate mr-4">{item.name}</span>
                      <span className="text-gold/80 shrink-0">${parseFloat(item.price).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-serif pt-2 border-t border-gold/20 mt-2">
                    <span className="text-cream/60 italic">Subtotal</span>
                    <span className="text-gold">${total.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              <div className="py-4 flex justify-between items-center">
                <span className="font-display tracking-[0.2em] text-cream text-sm">TABLE TOTAL</span>
                <span className="font-display text-gold text-xl">${tableTotal.toFixed(2)}</span>
              </div>

              {!saved && (
                <div className="pt-2 pb-2">
                  <button
                    type="button"
                    onClick={() => { setSaved(true); setSummaryOpen(false); }}
                    className="
                      w-full bg-gold text-navy font-display tracking-[0.3em]
                      text-sm py-3.5 hover:bg-gold-light transition-colors duration-200 font-medium
                    "
                  >
                    CONFIRM ORDER
                  </button>
                  <p className="text-center text-cream/50 text-sm font-serif mt-2 italic">
                    Once confirmed, the order cannot be edited
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  resolvedNames,
  order,
  onToggle,
  saved,
}: {
  category: MenuCategory;
  resolvedNames: string[];
  order: OrderState;
  onToggle: (itemId: string, guestNum: number) => void;
  saved: boolean;
}) {
  return (
    <section className="mb-12">
      <div className="relative text-center my-10">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-gold/25" />
        </div>
        <span className="relative bg-navy px-5 font-serif italic tracking-[0.18em] text-gold text-lg font-medium">
          {category.name}
        </span>
      </div>

      <div className="space-y-9">
        {category.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            resolvedNames={resolvedNames}
            selectedGuests={order[String(item.id)] ?? []}
            onToggle={onToggle}
            saved={saved}
          />
        ))}
      </div>
    </section>
  );
}

function MenuItemCard({
  item,
  resolvedNames,
  selectedGuests,
  onToggle,
  saved,
}: {
  item: MenuItem;
  resolvedNames: string[];
  selectedGuests: number[];
  onToggle: (itemId: string, guestNum: number) => void;
  saved: boolean;
}) {
  const hasSelection = selectedGuests.length > 0;
  const typeStyle = TYPE_STYLES[item.type];

  return (
    <div
      className={`text-center transition-opacity duration-200 ${
        hasSelection ? "opacity-100" : "opacity-85 hover:opacity-100"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 px-2">
        <span className="font-serif italic text-cream text-lg leading-snug font-medium">{item.name}</span>
        <span className="font-serif text-gold text-lg">${parseFloat(item.price).toFixed(2)}</span>
        <span className={`text-[11px] border rounded-sm px-1.5 py-px font-serif leading-none ${typeStyle.cls}`}>
          {typeStyle.label}
        </span>
      </div>

      {item.description && (
        <p className="text-cream/70 font-serif italic text-base mt-2 max-w-xs mx-auto leading-snug px-4">
          {item.description}
        </p>
      )}

      {item.allergens.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {item.allergens.map((a) => (
            <span
              key={a}
              className="text-[11px] border border-amber-400/40 text-amber-300/80 rounded-sm px-1.5 py-px font-serif leading-none"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {resolvedNames.map((name, idx) => {
          const guestNum = idx + 1;
          const selected = selectedGuests.includes(guestNum);
          return (
            <button
              type="button"
              key={guestNum}
              disabled={saved}
              onClick={() => onToggle(String(item.id), guestNum)}
              title={selected ? `Remove ${name}` : `Add for ${name}`}
              className={`
                px-4 py-1.5 rounded-full text-sm font-serif transition-all duration-200
                ${saved ? "cursor-default" : ""}
                ${
                  selected
                    ? "bg-gold text-navy font-semibold shadow-md shadow-gold/25 scale-105"
                    : `border border-gold/40 text-gold/70 ${!saved ? "hover:border-gold/80 hover:text-gold" : "opacity-50"}`
                }
              `}
            >
              {firstWord(name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
