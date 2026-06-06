export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface ServiceInfo {
  id: number;
  name: string;
}

export interface TableInfo {
  id: number;
  name: string;
  code: string;
}

export interface Booking {
  id: number;
  party_size: number;
  booking_ref: string;
  booking_date: string;
  booking_time: string;
  status: string;
  guest: Guest;
  service: ServiceInfo;
  tables: TableInfo[];
}

export type MenuItemType = "Veg" | "Non-Veg" | "Vegan";

export interface CategoryInfo {
  id: number;
  name: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  allergens: string[];
  type: MenuItemType;
  category: CategoryInfo;
  is_active: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

// ─── Hardcoded bookings (mirrors API response) ────────────────────────────────

export const bookings: Booking[] = [
  {
    id: 8281,
    party_size: 2,
    booking_ref: "FR-2026-0041",
    booking_date: "2026-06-05",
    booking_time: "09:00",
    status: "confirmed",
    guest: { id: 6477, first_name: "Akshat", last_name: "", phone: "+918445680090" },
    service: { id: 25, name: "Brunch" },
    tables: [{ id: 319, name: "B1", code: "B1" }],
  },
  {
    id: 8282,
    party_size: 4,
    booking_ref: "FR-2026-0042",
    booking_date: "2026-06-05",
    booking_time: "12:30",
    status: "confirmed",
    guest: { id: 6478, first_name: "Sarah", last_name: "Thompson", phone: "+447700900002" },
    service: { id: 25, name: "Brunch" },
    tables: [{ id: 320, name: "B2", code: "B2" }],
  },
  {
    id: 8283,
    party_size: 3,
    booking_ref: "FR-2026-0043",
    booking_date: "2026-06-05",
    booking_time: "19:00",
    status: "confirmed",
    guest: { id: 6479, first_name: "Michael", last_name: "Davies", phone: "+447700900003" },
    service: { id: 26, name: "Dinner" },
    tables: [{ id: 321, name: "D4", code: "D4" }],
  },
];

// ─── Hardcoded menu items (mirrors API response) ──────────────────────────────

const RAW_MENU_ITEMS: MenuItem[] = [
  {
    id: 2,
    name: "Salt & Pepper Calamari",
    description: null,
    price: "8.95",
    currency: "USD",
    allergens: ["Gluten"],
    type: "Non-Veg",
    category: { id: 2, name: "Starters" },
    is_active: true,
  },
  {
    id: 3,
    name: "Tomato & Basil Soup",
    description: null,
    price: "6.50",
    currency: "USD",
    allergens: ["Dairy"],
    type: "Veg",
    category: { id: 2, name: "Starters" },
    is_active: true,
  },
  {
    id: 4,
    name: "Halloumi Fries",
    description: null,
    price: "7.50",
    currency: "USD",
    allergens: ["Dairy"],
    type: "Veg",
    category: { id: 2, name: "Starters" },
    is_active: true,
  },
  {
    id: 13,
    name: "French Fries",
    description: "French Fries Starter",
    price: "15.00",
    currency: "USD",
    allergens: ["Dairy", "Hard Salt"],
    type: "Veg",
    category: { id: 2, name: "Starters" },
    is_active: true,
  },
  {
    id: 5,
    name: "Fish and Chips",
    description: null,
    price: "15.95",
    currency: "USD",
    allergens: ["Fish"],
    type: "Non-Veg",
    category: { id: 3, name: "Mains" },
    is_active: true,
  },
  {
    id: 6,
    name: "Mushroom Risotto",
    description: null,
    price: "13.95",
    currency: "USD",
    allergens: ["Dairy"],
    type: "Veg",
    category: { id: 3, name: "Mains" },
    is_active: true,
  },
  {
    id: 7,
    name: "Vegan Shepherd's Pie",
    description: null,
    price: "12.95",
    currency: "USD",
    allergens: [],
    type: "Vegan",
    category: { id: 3, name: "Mains" },
    is_active: true,
  },
  {
    id: 8,
    name: "Sticky Toffee Pudding",
    description: null,
    price: "6.95",
    currency: "USD",
    allergens: ["Dairy"],
    type: "Veg",
    category: { id: 4, name: "Desserts" },
    is_active: true,
  },
  {
    id: 9,
    name: "Eton Mess",
    description: null,
    price: "6.50",
    currency: "USD",
    allergens: [],
    type: "Veg",
    category: { id: 4, name: "Desserts" },
    is_active: true,
  },
  {
    id: 12,
    name: "Alfanso",
    description: "Desserts for the taste",
    price: "10.00",
    currency: "USD",
    allergens: ["Dairy"],
    type: "Veg",
    category: { id: 4, name: "Desserts" },
    is_active: true,
  },
];

function groupByCategory(items: MenuItem[]): MenuCategory[] {
  const map = new Map<number, MenuCategory>();
  for (const item of items) {
    if (!item.is_active) continue;
    if (!map.has(item.category.id)) {
      map.set(item.category.id, { id: item.category.id, name: item.category.name, items: [] });
    }
    map.get(item.category.id)!.items.push(item);
  }
  return Array.from(map.values());
}

export const menuCategories: MenuCategory[] = groupByCategory(RAW_MENU_ITEMS);

export function findBooking(query: string): Booking | null {
  const numId = parseInt(query, 10);
  if (!isNaN(numId)) {
    return bookings.find((b) => b.id === numId) ?? null;
  }
  const normalized = query.trim().toLowerCase();
  return bookings.find((b) => b.booking_ref.toLowerCase() === normalized) ?? null;
}
