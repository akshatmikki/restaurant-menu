import { redirect } from "next/navigation";
import { findBooking } from "../lib/data";
import { menuCategories } from "../lib/types";
import MenuClient from "./MenuClient";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) redirect("/");

  const booking = await findBooking(id);

  if (!booking) redirect("/");

  return <MenuClient booking={booking} menuCategories={menuCategories} />;
}
