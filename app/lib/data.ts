import pool from "./db";
import type { Booking, MenuCategory, MenuItemType, ExistingOrder, OrderDetailGuest } from "./types";

function normalizeType(raw: string): MenuItemType {
  const s = raw.trim().toLowerCase();
  if (s === "vegan") return "Vegan";
  if (s === "veg" || s === "vegetarian") return "Veg";
  return "Non-Veg";
}

export async function getMenuCategories(menuId: number): Promise<MenuCategory[]> {
  const { rows } = await pool.query<{
    category_id: number;
    category_name: string;
    item_id: number;
    item_name: string;
    description: string | null;
    price: string;
    currency: string;
    type: string;
    allergens: string[];
  }>(`
    SELECT
      COALESCE(cat.id, 0)           AS category_id,
      COALESCE(cat.name, 'Menu')    AS category_name,
      mi.id                          AS item_id,
      mi.name                        AS item_name,
      mi.description,
      mi.price::text,
      COALESCE(mi.currency, 'GBP')  AS currency,
      mi.type,
      COALESCE(mi.allergens, '[]'::jsonb) AS allergens
    FROM  menu_items mi
    LEFT  JOIN menu_categories cat ON cat.id = mi.category_id
    WHERE mi.menu_id = $1
      AND mi.is_active = true
    ORDER BY
      COALESCE(cat.sort_order, cat.id, 0),
      COALESCE(mi.sort_order, mi.id),
      mi.id
  `, [menuId]);

  const map = new Map<number, MenuCategory>();
  for (const row of rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        items: [],
      });
    }
    const allergens: string[] = Array.isArray(row.allergens)
      ? row.allergens
      : (typeof row.allergens === "string" ? JSON.parse(row.allergens) : []);

    map.get(row.category_id)!.items.push({
      id: row.item_id,
      name: row.item_name,
      description: row.description,
      price: row.price,
      currency: row.currency,
      type: normalizeType(row.type ?? ""),
      allergens,
      category: { id: row.category_id, name: row.category_name },
      is_active: true,
    });
  }
  return Array.from(map.values());
}

export async function getMenuName(menuId: number): Promise<string | null> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM menus WHERE id = $1 LIMIT 1`,
    [menuId],
  );
  return rows[0]?.name ?? null;
}

export async function getFallbackMenuId(): Promise<number | null> {
  const { rows } = await pool.query<{ menu_id: number }>(
    `SELECT menu_id FROM menu_items WHERE is_active = true ORDER BY menu_id DESC LIMIT 1`,
  );
  return rows[0]?.menu_id ?? null;
}

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
      b.menu_id,
      b.guest_name          AS booking_guest_name,
      g.id                  AS guest_id,
      g.first_name,
      g.last_name,
      g.phone
    FROM public.bookings b
    LEFT JOIN public.guests g ON g.id = b.guest_id
    WHERE ${!isNaN(numId) ? "b.id = $1" : "LOWER(b.booking_ref) = LOWER($1)"}
    LIMIT 1
    `,
    [!isNaN(numId) ? numId : query.trim()],
  );

  return rows.length ? mapBookingRow(rows[0]) : null;
}

export async function getExistingOrder(bookingId: number): Promise<ExistingOrder | null> {
  const { rows } = await pool.query<{
    order_id: number;
    confirmed_at: string;
    booking_ref: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    menu_name: string | null;
    primary_guest_name: string | null;
    guest_number: number;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    menu_item_id: number;
    item_name: string;
    item_category: string | null;
    item_type: string;
    item_price: number;
    item_currency: string;
    item_description: string | null;
  }>(
    `SELECT
       order_id, confirmed_at, booking_ref, booking_date::text, booking_time,
       party_size, menu_name, primary_guest_name,
       guest_number, guest_name, guest_email, guest_phone,
       menu_item_id, item_name, item_category, item_type,
       item_price, item_currency, item_description
     FROM pre_order_details
     WHERE booking_id = $1
     ORDER BY guest_number, menu_item_id`,
    [bookingId],
  );

  if (rows.length === 0) return null;

  const first = rows[0];
  const guestMap = new Map<number, OrderDetailGuest>();

  for (const row of rows) {
    if (!guestMap.has(row.guest_number)) {
      guestMap.set(row.guest_number, {
        guestNumber: row.guest_number,
        guestName: row.guest_name,
        guestEmail: row.guest_email,
        guestPhone: row.guest_phone,
        items: [],
      });
    }
    guestMap.get(row.guest_number)!.items.push({
      menuItemId: row.menu_item_id,
      itemName: row.item_name,
      itemCategory: row.item_category,
      itemType: row.item_type,
      itemPrice: parseFloat(String(row.item_price)),
      itemCurrency: row.item_currency,
      itemDescription: row.item_description,
    });
  }

  return {
    orderId: first.order_id,
    confirmedAt: first.confirmed_at,
    bookingRef: first.booking_ref,
    bookingDate: first.booking_date,
    bookingTime: first.booking_time,
    partySize: first.party_size,
    menuName: first.menu_name,
    primaryGuestName: first.primary_guest_name,
    guests: Array.from(guestMap.values()),
  };
}

function mapBookingRow(row: Record<string, unknown>): Booking {
  // guest_name on the booking row is used when the guests join returns nothing
  const bookingGuestName = (row.booking_guest_name as string) ?? "";
  const [fallbackFirst, ...fallbackRest] = bookingGuestName.split(" ");

  return {
    id: row.id as number,
    party_size: row.party_size as number,
    booking_ref: (row.booking_ref as string) ?? "",
    booking_date: (row.booking_date as string) ?? "",
    booking_time: ((row.booking_time as string) ?? "").slice(0, 5),
    status: (row.status as string) ?? "",
    menu_id: (row.menu_id as number | null) ?? null,
    guest: {
      id: (row.guest_id as number) ?? 0,
      first_name: (row.first_name as string) ?? fallbackFirst ?? "",
      last_name: (row.last_name as string) ?? fallbackRest.join(" ") ?? "",
      phone: (row.phone as string) ?? "",
    },
    service: { id: 0, name: "" },
    tables: [],
  };
}
