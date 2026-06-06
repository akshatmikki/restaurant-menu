import { redirect } from "next/navigation";
import { findBooking, menuCategories } from "../lib/data";
import MenuClient from "./MenuClient";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) redirect("/");

  const booking = findBooking(id);
  if (!booking) redirect("/");

  return <MenuClient booking={booking} menuCategories={menuCategories} />;
}
