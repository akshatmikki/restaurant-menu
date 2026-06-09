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
  menu_id: number | null;
  guest: Guest;
  service: ServiceInfo;
  tables: TableInfo[];
}

export const MENU_NAME = "Grofers Sunday";

export interface OrderDetailItem {
  menuItemId: number;
  itemName: string;
  itemCategory: string | null;
  itemType: string;
  itemPrice: number;
  itemCurrency: string;
  itemDescription: string | null;
}

export interface OrderDetailGuest {
  guestNumber: number;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  items: OrderDetailItem[];
}

export interface ExistingOrder {
  orderId: number;
  confirmedAt: string;
  bookingRef: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  menuName: string | null;
  primaryGuestName: string | null;
  guests: OrderDetailGuest[];
}
