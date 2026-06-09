import { redirect } from "next/navigation";
import { findBooking, getMenuCategories, getFallbackMenuId, getMenuName, getExistingOrder } from "../lib/data";
import type { Booking, MenuCategory, ExistingOrder } from "../lib/types";
import MenuClient from "./MenuClient";

function fallbackBooking(id: string): Booking {
  return {
    id: parseInt(id, 10) || 0,
    party_size: 1,
    booking_ref: id,
    booking_date: new Date().toISOString().split("T")[0],
    booking_time: "",
    status: "pending",
    menu_id: null,
    guest: { id: 0, first_name: "", last_name: "", phone: "" },
    service: { id: 0, name: "" },
    tables: [],
  };
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) redirect("/");

  let booking: Booking;
  try {
    booking = (await findBooking(id)) ?? fallbackBooking(id);
  } catch {
    booking = fallbackBooking(id);
  }

  let existingOrder: ExistingOrder | null = null;
  try {
    existingOrder = await getExistingOrder(booking.id);
  } catch {
    // treat as no existing order
  }

  if (existingOrder) {
    return <MenuClient booking={booking} menuCategories={[]} menuName={existingOrder.menuName} existingOrder={existingOrder} />;
  }

  let menuCats: MenuCategory[] = [];
  let resolvedMenuId = booking.menu_id;

  if (resolvedMenuId != null) {
    try {
      menuCats = await getMenuCategories(resolvedMenuId);
    } catch {
      // menu unavailable
    }
  }
  if (menuCats.length === 0) {
    const fallbackId = await getFallbackMenuId();
    if (fallbackId != null) {
      resolvedMenuId = fallbackId;
      try {
        menuCats = await getMenuCategories(fallbackId);
      } catch {
        // menu unavailable — empty list shown to user
      }
    }
  }

  let menuName: string | null = null;
  if (resolvedMenuId != null) {
    try {
      menuName = await getMenuName(resolvedMenuId);
    } catch {
      // fall back to null
    }
  }

  return <MenuClient booking={booking} menuCategories={menuCats} menuName={menuName} existingOrder={null} />;
}
