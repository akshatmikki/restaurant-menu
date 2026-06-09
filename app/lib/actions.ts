'use server'

import pool from './db';

interface GuestInput {
  name: string;
  email: string;
  phone: string;
}

interface OrderItemInput {
  menuItemId: number;
  guestNumber: number;
  guestName: string;
}

export async function submitOrder(
  bookingId: number,
  guests: GuestInput[],
  items: OrderItemInput[],
): Promise<{ orderId: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders (booking_id, status, created_at)
       VALUES ($1, 'confirmed', NOW())
       RETURNING id`,
      [bookingId],
    );
    const orderId = rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, guest_number, guest_name)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.menuItemId, item.guestNumber, item.guestName],
      );
    }

    for (let i = 0; i < guests.length; i++) {
      await client.query(
        `INSERT INTO order_guests (order_id, guest_number, name, email, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, i + 1, guests[i].name, guests[i].email || null, guests[i].phone || null],
      );
    }

    // Fetch booking details for order_details
    const { rows: bookingRows } = await client.query<{
      booking_ref: string;
      booking_date: string;
      booking_time: string;
      party_size: number;
      menu_id: number | null;
      primary_guest_name: string | null;
      primary_guest_phone: string | null;
    }>(
      `SELECT
         b.booking_ref,
         b.booking_date::text,
         b.booking_time::text,
         b.party_size,
         b.menu_id,
         COALESCE(g.first_name || ' ' || g.last_name, b.guest_name) AS primary_guest_name,
         g.phone AS primary_guest_phone
       FROM public.bookings b
       LEFT JOIN public.guests g ON g.id = b.guest_id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId],
    );
    const booking = bookingRows[0];

    // Fetch menu name
    let menuName: string | null = null;
    if (booking?.menu_id) {
      const { rows: menuRows } = await client.query<{ name: string }>(
        `SELECT name FROM menus WHERE id = $1 LIMIT 1`,
        [booking.menu_id],
      );
      menuName = menuRows[0]?.name ?? null;
    }

    // Fetch all menu item details in one query
    const menuItemIds = items.map((i) => i.menuItemId);
    const { rows: itemRows } = await client.query<{
      id: number;
      name: string;
      description: string | null;
      price: string;
      currency: string;
      type: string;
      allergens: unknown;
      category_name: string | null;
      menu_id: number;
    }>(
      `SELECT
         mi.id,
         mi.name,
         mi.description,
         mi.price::text,
         COALESCE(mi.currency, 'GBP') AS currency,
         mi.type,
         COALESCE(mi.allergens, '[]'::jsonb) AS allergens,
         cat.name AS category_name,
         mi.menu_id
       FROM menu_items mi
       LEFT JOIN menu_categories cat ON cat.id = mi.category_id
       WHERE mi.id = ANY($1)`,
      [menuItemIds],
    );
    const itemMap = new Map(itemRows.map((r) => [r.id, r]));

    // Insert one row per ordered item into order_details
    for (const item of items) {
      const detail = itemMap.get(item.menuItemId);
      const guest = guests[item.guestNumber - 1];
      const resolvedMenuId = booking?.menu_id ?? detail?.menu_id ?? null;

      await client.query(
        `INSERT INTO pre_order_details (
           order_id, confirmed_at, order_status,
           booking_id, booking_ref, booking_date, booking_time, party_size,
           menu_id, menu_name,
           primary_guest_name, primary_guest_phone,
           guest_number, guest_name, guest_email, guest_phone,
           menu_item_id, item_name, item_category, item_type,
           item_price, item_currency, item_allergens, item_description
         ) VALUES (
           $1, NOW(), 'confirmed',
           $2, $3, $4, $5, $6,
           $7, $8,
           $9, $10,
           $11, $12, $13, $14,
           $15, $16, $17, $18,
           $19, $20, $21, $22
         )`,
        [
          orderId,
          bookingId,
          booking?.booking_ref ?? null,
          booking?.booking_date ?? null,
          booking?.booking_time ? booking.booking_time.slice(0, 5) : null,
          booking?.party_size ?? null,
          resolvedMenuId,
          menuName,
          booking?.primary_guest_name ?? null,
          booking?.primary_guest_phone ?? null,
          item.guestNumber,
          item.guestName,
          guest?.email || null,
          guest?.phone || null,
          item.menuItemId,
          detail?.name ?? null,
          detail?.category_name ?? null,
          detail?.type ?? null,
          detail?.price ? parseFloat(detail.price) : null,
          detail?.currency ?? 'GBP',
          detail?.allergens ? JSON.stringify(detail.allergens) : '[]',
          detail?.description ?? null,
        ],
      );
    }

    await client.query('COMMIT');
    return { orderId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
