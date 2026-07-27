import { createClient } from "@supabase/supabase-js";

// Publishable key — safe in the browser. All access is governed by
// Row Level Security; public writes only happen through RPCs.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "out_for_delivery",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number] | "cancelled";

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  emoji: string;
  in_stock: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Order = {
  id: string;
  code: string;
  customer_name: string;
  phone: string;
  address: string;
  note: string | null;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Admin = {
  user_id: string;
  name: string;
  email: string | null;
  is_owner: boolean;
  created_at: string;
};
