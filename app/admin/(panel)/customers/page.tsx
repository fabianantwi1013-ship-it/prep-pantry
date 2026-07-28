"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Order } from "@/lib/supabase";
import { cedis, timeAgo, waLink } from "@/lib/format";

// One row per unique phone number, built from the order history.
type Customer = {
  name: string;
  phone: string;
  address: string;
  orders: number;
  spent: number;
  lastOrder: string;
};

export default function AdminCustomersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("pp_orders")
      .select("*")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setOrders((data ?? []) as Order[]);
      });
  }, []);

  const customers = useMemo(() => {
    const byPhone = new Map<string, Customer>();
    for (const o of orders ?? []) {
      const key = o.phone.replace(/\D/g, "") || o.phone;
      const existing = byPhone.get(key);
      if (existing) {
        existing.orders += 1;
        existing.spent += Number(o.total);
      } else {
        // Orders arrive newest-first, so the first one seen has the freshest
        // name and address for this phone number.
        byPhone.set(key, {
          name: o.customer_name,
          phone: o.phone,
          address: o.address,
          orders: 1,
          spent: Number(o.total),
          lastOrder: o.created_at,
        });
      }
    }
    const q = query.trim().toLowerCase();
    return Array.from(byPhone.values()).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [orders, query]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-950">Customers</h1>
          <p className="text-sm text-emerald-900/50">
            Everyone who has ordered, with their contact details. Built
            automatically from orders.
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone or area…"
          className="w-full max-w-xs rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {orders === null ? (
          <p className="py-16 text-center text-emerald-900/40">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="rounded-2xl border border-emerald-100 bg-white py-16 text-center text-emerald-900/40">
            {query
              ? "No customers match your search."
              : "No customers yet — they'll appear here after their first order."}
          </p>
        ) : (
          customers.map((c) => (
            <div
              key={c.phone}
              className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-base font-extrabold text-emerald-800">
                  {c.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-emerald-950">{c.name}</p>
                  <p className="text-sm text-emerald-900/60">📍 {c.address}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-extrabold text-emerald-950">
                    {c.orders} order{c.orders > 1 ? "s" : ""} · {cedis(c.spent)}
                  </p>
                  <p className="text-emerald-900/50">last {timeAgo(c.lastOrder)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  className="rounded-xl bg-emerald-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                >
                  📞 {c.phone}
                </a>
                <a
                  href={waLink(
                    c.phone,
                    `Hello ${c.name.split(" ")[0]}, this is Prep & Pantry. `
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  💬 WhatsApp
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
