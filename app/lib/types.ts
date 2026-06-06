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
  guest: Guest;
  service: ServiceInfo;
  tables: TableInfo[];
}

export const MENU_NAME = "Grofers Sunday";

export const menuCategories: MenuCategory[] = [
  {
    id: 1,
    name: "Main Course",
    items: [
      {
        id: 1,
        name: "Turkey Dinner",
        description: "Roasted turkey with seasonal vegetables and gravy",
        price: "28.00",
        currency: "USD",
        allergens: ["Gluten"],
        type: "Non-Veg",
        category: { id: 1, name: "Main Course" },
        is_active: true,
      },
      {
        id: 2,
        name: "Vegan Polenta",
        description: "Creamy polenta with roasted vegetables and herbs",
        price: "22.00",
        currency: "USD",
        allergens: [],
        type: "Vegan",
        category: { id: 1, name: "Main Course" },
        is_active: true,
      },
    ],
  },
  {
    id: 2,
    name: "Desserts",
    items: [
      {
        id: 3,
        name: "Cheesecake",
        description: "New York style cheesecake with berry compote",
        price: "9.00",
        currency: "USD",
        allergens: ["Dairy", "Gluten", "Eggs"],
        type: "Veg",
        category: { id: 2, name: "Desserts" },
        is_active: true,
      },
      {
        id: 4,
        name: "Crème Brûlée",
        description: "Classic French custard with caramelised sugar crust",
        price: "9.00",
        currency: "USD",
        allergens: ["Dairy", "Eggs"],
        type: "Veg",
        category: { id: 2, name: "Desserts" },
        is_active: true,
      },
    ],
  },
];
