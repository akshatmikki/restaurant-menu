'use server'

import pool from './db';

export async function registerGuest(
  bookingId: number,
  name: string,
  phone: string,
  email: string | null,
  ownerPhone: string | null,
  partySize: number,
): Promise<
  | { success: true; registrationId: number; isOwner: boolean }
  | { success: false; error: 'party_full' | 'already_registered' | 'error' }
> {
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  if (!normalizedPhone) return { success: false, error: 'error' };

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_registrations (
        id           SERIAL PRIMARY KEY,
        booking_id   INTEGER      NOT NULL,
        name         VARCHAR(100) NOT NULL,
        phone        VARCHAR(30)  NOT NULL,
        email        VARCHAR(100),
        is_owner     BOOLEAN      NOT NULL DEFAULT FALSE,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS booking_reg_phone_idx
      ON booking_registrations(booking_id, phone)
    `);

    await client.query('BEGIN');

    const { rows: countRows } = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM booking_registrations WHERE booking_id = $1`,
      [bookingId],
    );
    const currentCount = parseInt(countRows[0].count, 10);

    if (currentCount >= partySize) {
      await client.query('ROLLBACK');
      return { success: false, error: 'party_full' };
    }

    const normalizedOwner = ownerPhone?.replace(/[^\d+]/g, '') ?? '';
    const isOwner = Boolean(
      (normalizedOwner && normalizedPhone === normalizedOwner) || currentCount === 0,
    );

    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO booking_registrations (booking_id, name, phone, email, is_owner)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [bookingId, name.trim(), normalizedPhone, email?.trim() || null, isOwner],
    );

    await client.query('COMMIT');
    return { success: true, registrationId: rows[0].id, isOwner };
  } catch (err: unknown) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    if ((err as { code?: string }).code === '23505') {
      return { success: false, error: 'already_registered' };
    }
    return { success: false, error: 'error' };
  } finally {
    client.release();
  }
}

export async function lookupGuestRegistration(
  bookingId: number,
  phone: string,
): Promise<{ id: number; name: string; isOwner: boolean } | null> {
  const normalized = phone.replace(/[^\d+]/g, '');
  if (!normalized) return null;
  try {
    const { rows } = await pool.query<{ id: number; name: string; is_owner: boolean }>(
      `SELECT id, name, is_owner FROM booking_registrations WHERE booking_id = $1 AND phone = $2 LIMIT 1`,
      [bookingId, normalized],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, name: rows[0].name, isOwner: rows[0].is_owner };
  } catch {
    return null;
  }
}

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

export async function saveMyMenuSelection(
  registrationId: number,
  menuItemIds: number[],
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS registration_menu_selections (
        registration_id INTEGER NOT NULL,
        menu_item_id    INTEGER NOT NULL,
        saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (registration_id, menu_item_id)
      )
    `);
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM registration_menu_selections WHERE registration_id = $1`,
      [registrationId],
    );
    if (menuItemIds.length > 0) {
      const placeholders = menuItemIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO registration_menu_selections (registration_id, menu_item_id) VALUES ${placeholders}`,
        [registrationId, ...menuItemIds],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function loadMyMenuSelection(registrationId: number): Promise<number[]> {
  try {
    const { rows } = await pool.query<{ menu_item_id: number }>(
      `SELECT menu_item_id FROM registration_menu_selections WHERE registration_id = $1`,
      [registrationId],
    );
    return rows.map((r) => r.menu_item_id);
  } catch {
    return [];
  }
}

export async function loadPartySelections(bookingId: number): Promise<
  Array<{ id: number; name: string; isOwner: boolean; itemIds: number[] }>
> {
  try {
    const { rows } = await pool.query<{
      id: number;
      name: string;
      is_owner: boolean;
      item_ids: number[] | null;
    }>(
      `SELECT
         br.id, br.name, br.is_owner,
         ARRAY_AGG(rms.menu_item_id ORDER BY rms.menu_item_id)
           FILTER (WHERE rms.menu_item_id IS NOT NULL) AS item_ids
       FROM booking_registrations br
       LEFT JOIN registration_menu_selections rms ON rms.registration_id = br.id
       WHERE br.booking_id = $1
       GROUP BY br.id, br.name, br.is_owner
       ORDER BY br.registered_at ASC`,
      [bookingId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      isOwner: r.is_owner,
      itemIds: r.item_ids ?? [],
    }));
  } catch {
    return [];
  }
}

export async function confirmPartyOrder(bookingId: number): Promise<{ orderId: number }> {
  const { rows: regRows } = await pool.query<{
    id: number; name: string; phone: string; email: string | null;
  }>(
    `SELECT id, name, phone, email FROM booking_registrations WHERE booking_id = $1 ORDER BY registered_at ASC`,
    [bookingId],
  );

  const regIds = regRows.map((r) => r.id);
  const selRows =
    regIds.length > 0
      ? (
          await pool.query<{ registration_id: number; menu_item_id: number }>(
            `SELECT registration_id, menu_item_id FROM registration_menu_selections WHERE registration_id = ANY($1)`,
            [regIds],
          )
        ).rows
      : [];

  const selByReg = new Map<number, number[]>();
  for (const row of selRows) {
    if (!selByReg.has(row.registration_id)) selByReg.set(row.registration_id, []);
    selByReg.get(row.registration_id)!.push(row.menu_item_id);
  }

  const guests: GuestInput[] = regRows.map((r) => ({
    name: r.name,
    email: r.email ?? '',
    phone: r.phone,
  }));
  const items: OrderItemInput[] = regRows.flatMap((reg, i) =>
    (selByReg.get(reg.id) ?? []).map((itemId) => ({
      menuItemId: itemId,
      guestNumber: i + 1,
      guestName: reg.name,
    })),
  );

  return submitOrder(bookingId, guests, items);
}
