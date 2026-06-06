import { redirect } from "next/navigation";
import { findBooking } from "../lib/data";
import { menuCategories } from "../lib/types";
import type { Booking } from "../lib/types";
import MenuClient from "./MenuClient";

function fallbackBooking(id: string): Booking {
  return {
    id: parseInt(id, 10) || 0,
    party_size: 1,
    booking_ref: id,
    booking_date: new Date().toISOString().split("T")[0],
    booking_time: "",
    status: "pending",
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

  return <MenuClient booking={booking} menuCategories={menuCategories} />;
}
