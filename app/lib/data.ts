import pool from "./db";
import type { Booking } from "./types";

export async function findBooking(query: string): Promise<Booking | null> {
  const numId = parseInt(query, 10);

  const { rows } = await pool.query(
    `
    SELECT
      b.id,
      b.party_size,
      b.booking_ref,
      b.booking_date::text  AS booking_date,
      b.booking_time::text  AS booking_time,
      b.status,
      g.id          AS guest_id,
      g.first_name,
      g.last_name,
      g.phone
    FROM public.bookings b
    JOIN public.guests g ON g.id = b.guest_id
    WHERE ${!isNaN(numId) ? "b.id = $1" : "LOWER(b.booking_ref) = LOWER($1)"}
    LIMIT 1
    `,
    [!isNaN(numId) ? numId : query.trim()],
  );

  return rows.length ? mapBookingRow(rows[0]) : null;
}

function mapBookingRow(row: Record<string, unknown>): Booking {
  return {
    id: row.id as number,
    party_size: row.party_size as number,
    booking_ref: (row.booking_ref as string) ?? "",
    booking_date: (row.booking_date as string) ?? "",
    booking_time: ((row.booking_time as string) ?? "").slice(0, 5),
    status: (row.status as string) ?? "",
    guest: {
      id: row.guest_id as number,
      first_name: (row.first_name as string) ?? "",
      last_name: (row.last_name as string) ?? "",
      phone: (row.phone as string) ?? "",
    },
    service: { id: 0, name: "" },
    tables: [],
  };
}
