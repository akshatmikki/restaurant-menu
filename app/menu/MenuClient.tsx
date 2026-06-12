"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  Booking,
  MenuCategory,
  MenuItem,
  MenuItemType,
  ExistingOrder,
  GuestRegistration,
} from "../lib/types";
import {
  registerGuest,
  saveMyMenuSelection,
  loadMyMenuSelection,
  loadPartySelections,
  confirmPartyOrder,
  lookupGuestRegistration,
} from "../lib/actions";

interface Props {
  booking: Booking;
  menuCategories: MenuCategory[];
  menuName: string | null;
  existingOrder: ExistingOrder | null;
  registrationCount: number;
  registrations: GuestRegistration[];
}

interface MyReg {
  id: number;
  name: string;
  isOwner: boolean;
}

type PartyEntry = { id: number; name: string; isOwner: boolean; itemIds: number[] };

type Phase =
  | "loading"
  | "register"
  | "party_full"
  | "my_menu"
  | "party_view";

const COUNTRY_CODES = [
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+34",  flag: "🇪🇸", name: "Spain" },
  { code: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "+32",  flag: "🇧🇪", name: "Belgium" },
  { code: "+41",  flag: "🇨🇭", name: "Switzerland" },
  { code: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "+47",  flag: "🇳🇴", name: "Norway" },
  { code: "+45",  flag: "🇩🇰", name: "Denmark" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+48",  flag: "🇵🇱", name: "Poland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+30",  flag: "🇬🇷", name: "Greece" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "+82",  flag: "🇰🇷", name: "South Korea" },
];

function CountryCodeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const selected = COUNTRY_CODES.find((c) => c.code === value);
  const filtered = search
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search),
      )
    : COUNTRY_CODES;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 py-2 pr-3 text-cream font-serif text-base focus:outline-none group"
      >
        <span className="text-lg leading-none">{selected?.flag}</span>
        <span className="text-gold/90 tracking-wide">{value}</span>
        <span className={`text-gold/40 text-[10px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-60 bg-[#0d1829] border border-gold/40 shadow-2xl shadow-black/70">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gold/20">
            <span className="text-gold/40 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              autoFocus
              className="flex-1 bg-transparent text-cream text-sm font-serif placeholder:text-cream/35 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-cream/40 font-serif italic text-sm text-center py-4">No results</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); setSearch(""); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-serif text-left transition-colors ${
                  value === c.code
                    ? "bg-gold/15 text-gold"
                    : "text-cream/80 hover:bg-gold/8 hover:text-cream"
                }`}
              >
                <span className="text-base leading-none shrink-0">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className={`shrink-0 text-xs tabular-nums ${value === c.code ? "text-gold" : "text-gold/50"}`}>{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_STYLES: Record<MenuItemType, { label: string; cls: string }> = {
  Veg:       { label: "Veg",     cls: "text-emerald-400 border-emerald-400/50" },
  Vegan:     { label: "Vegan",   cls: "text-teal-300 border-teal-300/50" },
  "Non-Veg": { label: "Non-Veg", cls: "text-rose-400 border-rose-400/50" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Logo({ small }: { small?: boolean }) {
  const sz = small ? "w-12 h-12" : "w-16 h-16";
  const txt = small ? "text-lg" : "text-2xl";
  return (
    <div className={`relative mx-auto ${sz} flex items-center justify-center mb-4`}>
      <div className="absolute inset-0 rounded-full border border-gold/50" />
      <div className="absolute inset-1.5 rounded-full border border-gold/30" />
      <span className={`font-display text-gold ${txt} font-light select-none`}>G</span>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 justify-center mt-3">
      <div className="h-px bg-gold/40 w-16" />
      <div className="w-1 h-1 bg-gold/60 rotate-45" />
      <div className="h-px bg-gold/40 w-16" />
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export default function MenuClient({
  booking,
  menuCategories,
  menuName,
  existingOrder,
  registrationCount,
  registrations,
}: Props) {
  const MENU_NAME = menuName ?? "Menu";
  const guestCount = booking.party_size;
  const LS_KEY = `booking_reg_${booking.booking_ref}`;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [myReg, setMyReg] = useState<MyReg | null>(null);
  const [regCount, setRegCount] = useState(registrationCount);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regCountryCode, setRegCountryCode] = useState("+44");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // My menu selection
  const [mySelection, setMySelection] = useState<Set<number>>(new Set());
  const [selectionSaved, setSelectionSaved] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Party view
  const [partyEntries, setPartyEntries] = useState<PartyEntry[] | null>(null);
  const [partyLoading, setPartyLoading] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);

  // Item lookup map
  const itemMap = useMemo(() => {
    const map = new Map<number, MenuItem>();
    for (const cat of menuCategories) {
      for (const item of cat.items) map.set(item.id, item);
    }
    return map;
  }, [menuCategories]);

  useEffect(() => {
    async function init() {
      try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
          const reg: MyReg = JSON.parse(stored);
          setMyReg(reg);
          const itemIds = await loadMyMenuSelection(reg.id);
          setMySelection(new Set(itemIds));
          setSelectionSaved(itemIds.length > 0);
          setPhase("my_menu");
          return;
        }
      } catch { /* ignore */ }
      setPhase(registrationCount >= guestCount ? "party_full" : "register");
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegister() {
    if (!regName.trim() || !regPhone.trim()) return;
    setRegSubmitting(true);
    setRegError(null);
    const fullPhone = regCountryCode + regPhone.trim();
    try {
      const result = await registerGuest(
        booking.id, regName, fullPhone, regEmail || null,
        booking.guest.phone || null, guestCount,
      );
      if (!result.success) {
        if (result.error === "party_full") setPhase("party_full");
        else if (result.error === "already_registered") {
          // Phone already registered (e.g. host switching devices) — restore session
          const existing = await lookupGuestRegistration(booking.id, fullPhone);
          if (existing) {
            const reg: MyReg = { id: existing.id, name: existing.name, isOwner: existing.isOwner };
            localStorage.setItem(LS_KEY, JSON.stringify(reg));
            setMyReg(reg);
            const itemIds = await loadMyMenuSelection(reg.id);
            setMySelection(new Set(itemIds));
            setSelectionSaved(itemIds.length > 0);
            setPhase("my_menu");
          } else {
            setRegError("This phone number is already registered for this booking.");
          }
        } else setRegError("Something went wrong. Please try again.");
        return;
      }
      const reg: MyReg = { id: result.registrationId, name: regName.trim(), isOwner: result.isOwner };
      localStorage.setItem(LS_KEY, JSON.stringify(reg));
      setMyReg(reg);
      setRegCount((c) => c + 1);
      setPhase("my_menu");
    } catch {
      setRegError("Something went wrong. Please try again.");
    } finally {
      setRegSubmitting(false);
    }
  }

  function toggleMyItem(itemId: number) {
    setMySelection((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    setSelectionSaved(false);
  }

  async function handleSaveSelection() {
    if (!myReg) return;
    setSavingSelection(true);
    setSaveError(null);
    try {
      await saveMyMenuSelection(myReg.id, Array.from(mySelection));
      setSelectionSaved(true);
      setSummaryOpen(false);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSavingSelection(false);
    }
  }

  async function handleOpenPartyView() {
    // Auto-save before viewing party
    if (!selectionSaved && myReg) {
      try {
        await saveMyMenuSelection(myReg.id, Array.from(mySelection));
        setSelectionSaved(true);
      } catch { /* ignore, still open party view */ }
    }
    setPartyLoading(true);
    setPhase("party_view");
    setConfirmError(null);
    try {
      const entries = await loadPartySelections(booking.id);
      setPartyEntries(entries);
    } finally {
      setPartyLoading(false);
    }
  }

  async function handleConfirmPartyOrder() {
    setConfirmingOrder(true);
    setConfirmError(null);
    try {
      const result = await confirmPartyOrder(booking.id);
      setConfirmedOrderId(result.orderId);
      setOrderConfirmed(true);
      router.refresh();
    } catch {
      setConfirmError("Failed to confirm order. Please try again.");
    } finally {
      setConfirmingOrder(false);
    }
  }

  const mySelectedItems = useMemo(
    () => Array.from(mySelection).map((id) => itemMap.get(id)).filter(Boolean) as MenuItem[],
    [mySelection, itemMap],
  );
  const myTotal = mySelectedItems.reduce((s, item) => s + parseFloat(item.price), 0);
  const sym = mySelectedItems[0]?.currency === "GBP" ? "£" : "$";

  const guestLabel = [booking.guest.first_name, booking.guest.last_name].filter(Boolean).join(" ");

  // ─── Existing confirmed order ─────────────────────────────────────────────

  if (existingOrder || orderConfirmed) {
    if (existingOrder) {
      const existingTotal = existingOrder.guests.reduce(
        (sum, g) => sum + g.items.reduce((s, i) => s + i.itemPrice, 0),
        0,
      );
      const existingGuestLabel = existingOrder.primaryGuestName ?? booking.guest.first_name;
      const currency = existingOrder.guests[0]?.items[0]?.itemCurrency;
      const exSym = currency === "GBP" ? "£" : "$";
      return (
        <div className="min-h-screen bg-navy text-cream">
          <div className="sticky top-0 z-40 bg-emerald-800/95 border-b border-emerald-400/50 text-center py-3 px-4">
            <p className="font-display tracking-[0.25em] text-emerald-200 text-sm">
              ORDER CONFIRMED · #{existingOrder.orderId}
            </p>
          </div>
          <div className="text-center pt-10 pb-6 px-4">
            <Logo small />
            <h2 className="font-display text-cream tracking-[0.35em] text-2xl font-light">{MENU_NAME.toUpperCase()}</h2>
            <div className="flex items-center gap-3 justify-center mt-3">
              <div className="h-px bg-gold/45 w-20" /><div className="w-1 h-1 bg-gold/65 rotate-45" /><div className="h-px bg-gold/45 w-20" />
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 pb-16">
            <div className="border border-gold/30 bg-navy-light/70 p-6 mb-6 text-center">
              <p className="text-gold/80 font-serif text-xs tracking-widest uppercase mb-1">{existingOrder.bookingRef}</p>
              <p className="font-display text-cream text-2xl tracking-wide">{existingGuestLabel || "Guest"}</p>
              <p className="text-cream/70 font-serif text-base mt-1">Party of {existingOrder.partySize}</p>
              {existingOrder.bookingDate && (
                <p className="text-cream/55 font-serif text-sm mt-0.5">
                  {formatDate(existingOrder.bookingDate)}{existingOrder.bookingTime && ` at ${existingOrder.bookingTime}`}
                </p>
              )}
            </div>
            {existingOrder.guests.map((guest) => {
              const subtotal = guest.items.reduce((s, i) => s + i.itemPrice, 0);
              const gSym = guest.items[0]?.itemCurrency === "GBP" ? "£" : "$";
              return (
                <div key={guest.guestNumber} className="mb-6 border border-gold/20 p-5">
                  <p className="font-display tracking-[0.2em] text-gold text-xs mb-4 uppercase">{guest.guestName}</p>
                  {guest.items.map((item) => (
                    <div key={item.menuItemId} className="flex justify-between items-baseline text-base font-serif py-1 border-b border-gold/10 last:border-0">
                      <span className="italic text-cream/85 mr-4">{item.itemName}</span>
                      <span className="text-gold/80 shrink-0">{item.itemCurrency === "GBP" ? "£" : "$"}{item.itemPrice.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-serif pt-3 mt-1">
                    <span className="text-cream/60 italic">Subtotal</span>
                    <span className="text-gold">{gSym}{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            <div className="border border-gold/30 p-5 flex justify-between items-center">
              <span className="font-display tracking-[0.2em] text-cream text-sm">TABLE TOTAL</span>
              <span className="font-display text-gold text-xl">{exSym}{existingTotal.toFixed(2)}</span>
            </div>
            <p className="text-center text-cream/45 font-serif italic text-sm mt-8">Your order has been confirmed and cannot be edited.</p>
          </div>
        </div>
      );
    }

    // orderConfirmed locally (no items, so existingOrder is null)
    return (
      <PageShell>
        <div className="text-center mb-8">
          <Logo />
          <h1 className="font-display text-cream tracking-[0.3em] text-2xl font-light">{MENU_NAME.toUpperCase()}</h1>
          <Divider />
        </div>
        <div className="border border-emerald-400/40 bg-navy-light/70 p-8 text-center">
          <div className="w-12 h-12 rounded-full border border-emerald-400/60 flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-400 text-xl">✓</span>
          </div>
          <p className="font-display text-cream text-xl tracking-wide mb-2">Party Order Confirmed!</p>
          {confirmedOrderId && <p className="text-gold/70 font-serif text-sm mb-3">Order #{confirmedOrderId}</p>}
          <p className="text-cream/65 font-serif text-sm leading-relaxed">The party order has been successfully confirmed.</p>
        </div>
      </PageShell>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Party Full ───────────────────────────────────────────────────────────

  if (phase === "party_full") {
    return (
      <PageShell>
        <div className="text-center mb-10">
          <Logo />
          <h1 className="font-display text-cream tracking-[0.3em] text-2xl font-light">{MENU_NAME.toUpperCase()}</h1>
          <Divider />
        </div>
        <div className="border border-gold/30 bg-navy-light/70 p-8 text-center">
          <p className="text-gold/80 font-serif text-xs tracking-widest uppercase mb-3">{booking.booking_ref}</p>
          <p className="font-display text-cream text-xl tracking-wide mb-3">Registration Closed</p>
          <p className="text-cream/70 font-serif text-base leading-relaxed">All {guestCount} spots for this party have been filled.</p>
        </div>
      </PageShell>
    );
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  if (phase === "register") {
    return (
      <PageShell>
        <div className="text-center mb-10">
          <Logo />
          <h1 className="font-display text-cream tracking-[0.3em] text-2xl font-light">{MENU_NAME.toUpperCase()}</h1>
          <Divider />
        </div>

        <div className="border border-gold/30 bg-navy-light/70 p-6 mb-6">
          <div className="text-center mb-4">
            <p className="text-gold/80 font-serif text-xs tracking-widest uppercase mb-1">{booking.booking_ref}</p>
            <p className="font-display text-cream text-2xl tracking-wide">{guestLabel || MENU_NAME}</p>
            <p className="text-cream/70 font-serif text-base mt-1">
              Party of {guestCount}{booking.service.name ? ` · ${booking.service.name}` : ""}
            </p>
            {booking.booking_date && (
              <p className="text-cream/55 font-serif text-sm mt-0.5">
                {formatDate(booking.booking_date)}{booking.booking_time && ` at ${booking.booking_time}`}
                {booking.tables.length > 0 && ` · Table ${booking.tables[0].name}`}
              </p>
            )}
          </div>

          <div className="h-px bg-gold/25 mb-4" />

          <p className="text-center font-serif italic text-cream/65 text-base mb-5 leading-relaxed">
            Register to select your menu choices
          </p>

          <div className="space-y-4">
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Your full name *"
              maxLength={60}
              className="w-full bg-transparent border-b border-gold/35 text-cream placeholder:text-cream/40 py-2 font-serif text-base focus:outline-none focus:border-gold/80 transition-colors"
            />
            <div className="flex items-end border-b border-gold/35 focus-within:border-gold/80 transition-colors">
              <CountryCodeSelect value={regCountryCode} onChange={setRegCountryCode} />
              <div className="w-px h-5 bg-gold/30 shrink-0 mb-2 mr-2" />
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Phone number *"
                maxLength={15}
                className="flex-1 bg-transparent text-cream placeholder:text-cream/40 py-2 font-serif text-base focus:outline-none"
              />
            </div>
            <input
              type="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="Email address (optional)"
              maxLength={80}
              className="w-full bg-transparent border-b border-gold/25 text-cream placeholder:text-cream/35 py-2 font-serif text-base focus:outline-none focus:border-gold/60 transition-colors"
            />
          </div>
          {regError && <p className="text-rose-400 font-serif text-sm mt-3 text-center">{regError}</p>}
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={!regName.trim() || !regPhone.trim() || regSubmitting}
          className="w-full bg-gold text-navy font-display tracking-[0.3em] text-sm py-4 hover:bg-gold-light transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {regSubmitting ? "REGISTERING…" : "REGISTER & SELECT MENU"}
        </button>
        <p className="text-center text-cream/45 text-sm font-serif mt-4 italic">* Name and phone required</p>
      </PageShell>
    );
  }

  // ─── Party View (owner only) ───────────────────────────────────────────────

  if (phase === "party_view") {
    const partyTotal = (partyEntries ?? []).reduce(
      (sum, g) => sum + g.itemIds.reduce((s, id) => s + (parseFloat(itemMap.get(id)?.price ?? "0")), 0),
      0,
    );
    const partySym = sym;

    return (
      <div className="min-h-screen bg-navy text-cream">
        <header className="sticky top-0 z-30 bg-navy/98 backdrop-blur-sm border-b border-gold/25">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <button
                type="button"
                onClick={() => setPhase("my_menu")}
                className="text-gold/65 hover:text-gold text-xs font-display tracking-widest transition-colors block"
              >
                ← MY SELECTION
              </button>
              <p className="font-display text-cream text-lg tracking-wide mt-0.5">PARTY OVERVIEW</p>
              <p className="text-cream/60 font-serif text-sm">{booking.booking_ref} · Party of {guestCount}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-gold/60 text-xs font-serif">Table Total</p>
              <p className="text-gold font-display text-xl">{partySym}{partyTotal.toFixed(2)}</p>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-8 pb-36">
          {partyLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {(partyEntries ?? []).map((entry) => {
                const items = entry.itemIds.map((id) => itemMap.get(id)).filter(Boolean) as MenuItem[];
                const subtotal = items.reduce((s, item) => s + parseFloat(item.price), 0);
                const entrySym = items[0]?.currency === "GBP" ? "£" : "$";
                return (
                  <div key={entry.id} className="mb-6 border border-gold/20 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <p className="font-display tracking-[0.2em] text-gold text-sm uppercase">{entry.name}</p>
                        {entry.isOwner && (
                          <span className="text-[10px] border border-gold/40 text-gold/70 px-1.5 py-0.5 rounded font-serif">Host</span>
                        )}
                        {entry.id === myReg?.id && (
                          <span className="text-[10px] border border-emerald-400/40 text-emerald-400/70 px-1.5 py-0.5 rounded font-serif">You</span>
                        )}
                      </div>
                      <span className="text-gold/70 font-serif text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-cream/40 font-serif italic text-sm">No items selected yet</p>
                    ) : (
                      <>
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between items-baseline text-base font-serif py-1 border-b border-gold/10 last:border-0">
                            <span className="italic text-cream/85 mr-4 truncate">{item.name}</span>
                            <span className="text-gold/80 shrink-0">{item.currency === "GBP" ? "£" : "$"}{parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-serif pt-3 mt-1">
                          <span className="text-cream/60 italic">Subtotal</span>
                          <span className="text-gold">{entrySym}{subtotal.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Unregistered slots */}
              {Array.from({ length: Math.max(0, guestCount - (partyEntries?.length ?? 0)) }).map((_, i) => (
                <div key={`empty-${i}`} className="mb-6 border border-gold/10 p-5 opacity-50">
                  <p className="font-display tracking-[0.2em] text-gold/50 text-xs uppercase mb-2">
                    Guest {(partyEntries?.length ?? 0) + i + 1}
                  </p>
                  <p className="text-cream/35 font-serif italic text-sm">Not yet registered</p>
                </div>
              ))}

              <div className="border border-gold/30 p-5 flex justify-between items-center mb-2">
                <span className="font-display tracking-[0.2em] text-cream text-sm">TABLE TOTAL</span>
                <span className="font-display text-gold text-xl">{partySym}{partyTotal.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 bg-navy-light/98 backdrop-blur-sm border-t border-gold/30 px-4 py-4">
          {confirmError && <p className="text-rose-400 font-serif text-sm text-center mb-3">{confirmError}</p>}
          <button
            type="button"
            onClick={handleConfirmPartyOrder}
            disabled={confirmingOrder || partyLoading}
            className="w-full bg-gold text-navy font-display tracking-[0.3em] text-sm py-4 hover:bg-gold-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmingOrder ? "CONFIRMING…" : "CONFIRM PARTY ORDER"}
          </button>
          <p className="text-center text-cream/40 text-xs font-serif mt-2 italic">Once confirmed, the order cannot be edited</p>
        </div>
      </div>
    );
  }

  // ─── My Menu Selection ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy text-cream">

      <header className="sticky top-0 z-30 bg-navy/98 backdrop-blur-sm border-b border-gold/25">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-cream text-lg tracking-wide truncate">{myReg?.name ?? guestLabel}</p>
              {myReg?.isOwner && (
                <span className="shrink-0 text-[10px] border border-gold/50 text-gold/70 px-1.5 py-0.5 rounded font-serif">Host</span>
              )}
            </div>
            <p className="text-cream/60 font-serif text-sm">
              {booking.booking_ref}
              {booking.booking_time && ` · ${booking.booking_time}`}
              {booking.tables.length > 0 && ` · Table ${booking.tables[0].name}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {myReg?.isOwner && (
              <button
                type="button"
                onClick={handleOpenPartyView}
                className="text-xs font-display tracking-widest text-gold/70 hover:text-gold border border-gold/30 hover:border-gold/60 px-3 py-1.5 transition-colors"
              >
                PARTY VIEW
              </button>
            )}
            <div className="text-right">
              <p className="text-gold/60 text-xs font-serif">My Total</p>
              <p className="text-gold font-display text-lg">{sym}{myTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      {myReg?.isOwner && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-1 justify-center mb-2">
            {Array.from({ length: guestCount }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 max-w-8 rounded-full ${i < regCount ? "bg-gold" : "bg-gold/20"}`} />
            ))}
          </div>
          <p className="text-center text-cream/55 font-serif text-sm">{regCount} of {guestCount} guests registered</p>
        </div>
      )}

      <div className="text-center pt-10 pb-6 px-4">
        <Logo small />
        <h2 className="font-display text-cream tracking-[0.35em] text-2xl font-light">{MENU_NAME.toUpperCase()}</h2>
        <Divider />
        <p className="mt-3 text-cream/60 font-serif italic text-base">
          {selectionSaved
            ? "Your selection is saved — tap items to update"
            : "Tap dishes to add them to your order"}
        </p>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-48">
        {menuCategories.map((cat) => (
          <section key={cat.id} className="mb-12">
            <div className="relative text-center my-10">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-gold/25" />
              </div>
              <span className="relative bg-navy px-5 font-serif italic tracking-[0.18em] text-gold text-lg font-medium">
                {cat.name}
              </span>
            </div>
            <div className="space-y-9">
              {cat.items.map((item) => {
                const selected = mySelection.has(item.id);
                const typeStyle = TYPE_STYLES[item.type];
                return (
                  <div key={item.id} className={`text-center transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-80 hover:opacity-100"}`}>
                    <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 px-2">
                      <span className="font-serif italic text-cream text-lg leading-snug font-medium">{item.name}</span>
                      <span className="font-serif text-gold text-lg">
                        {item.currency === "GBP" ? "£" : "$"}{parseFloat(item.price).toFixed(2)}
                      </span>
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
                          <span key={a} className="text-[11px] border border-amber-400/40 text-amber-300/80 rounded-sm px-1.5 py-px font-serif leading-none">{a}</span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleMyItem(item.id)}
                      className={`mt-4 px-5 py-1.5 rounded-full text-sm font-serif transition-all duration-200 ${
                        selected
                          ? "bg-gold text-navy font-semibold shadow-md shadow-gold/25 scale-105"
                          : "border border-gold/40 text-gold/70 hover:border-gold/80 hover:text-gold"
                      }`}
                    >
                      {selected ? "✓ Added" : "+ Add to My Order"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="mt-10 border border-gold/25 p-6 text-center space-y-3">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-base font-serif">
            {(Object.entries(TYPE_STYLES) as [MenuItemType, { label: string; cls: string }][]).map(([key, { label, cls }]) => (
              <span key={key} className={`${cls} font-medium`}>{label}</span>
            ))}
          </div>
          <div className="h-px bg-gold/20" />
          <p className="text-cream/60 text-sm font-serif max-w-sm mx-auto leading-relaxed">
            If you have any dietary requirements, please advise your server. We cannot 100% guarantee that any dish is allergen free.
          </p>
        </div>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-navy-light/98 backdrop-blur-sm border-t border-gold/30 shadow-2xl">
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-navy-border/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-display tracking-[0.2em] text-gold text-sm">MY SELECTION</span>
            {selectionSaved && (
              <span className="text-emerald-300 font-serif text-xs border border-emerald-400/50 px-2 py-0.5 rounded-full">Saved ✓</span>
            )}
            {!selectionSaved && mySelection.size > 0 && (
              <span className="text-amber-300/80 font-serif text-xs border border-amber-400/40 px-2 py-0.5 rounded-full">Unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-display text-gold text-base">{sym}{myTotal.toFixed(2)}</span>
            <span className="text-gold/60 text-xs">{summaryOpen ? "▼" : "▲"}</span>
          </div>
        </button>

        {summaryOpen && (
          <div className="max-h-72 overflow-y-auto px-5 pb-4">
            {mySelectedItems.length === 0 ? (
              <p className="text-cream/50 font-serif italic text-sm text-center py-4">No items selected yet</p>
            ) : (
              <div className="divide-y divide-gold/15 mb-4">
                {mySelectedItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-baseline text-base font-serif py-2">
                    <span className="italic text-cream/85 truncate mr-4">{item.name}</span>
                    <span className="text-gold/80 shrink-0">{item.currency === "GBP" ? "£" : "$"}{parseFloat(item.price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-serif pt-3">
                  <span className="text-cream/60 italic">My Total</span>
                  <span className="text-gold">{sym}{myTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
            {saveError && <p className="text-rose-400 font-serif text-sm text-center mb-3">{saveError}</p>}
            <button
              type="button"
              onClick={handleSaveSelection}
              disabled={savingSelection || mySelection.size === 0}
              className="w-full bg-gold text-navy font-display tracking-[0.3em] text-sm py-3.5 hover:bg-gold-light transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingSelection ? "SAVING…" : selectionSaved ? "UPDATE SELECTION" : "SAVE MY SELECTION"}
            </button>
            <p className="text-center text-cream/40 text-xs font-serif mt-2 italic">
              You can update your selection any time before the order is confirmed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
