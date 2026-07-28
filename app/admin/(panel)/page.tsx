"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Order, type OrderItem, type OrderStatus } from "@/lib/supabase";
import { cedis, timeAgo, fullDateTime, STATUS_LABELS, waLink } from "@/lib/format";

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  new: { to: "confirmed", label: "Confirm order" },
  confirmed: { to: "out_for_delivery", label: "Out for delivery" },
  out_for_delivery: { to: "delivered", label: "Mark delivered" },
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  out_for_delivery: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pp_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setError(error.message);
    setOrders((data ?? []) as Order[]);
  }, []);

  useEffect(() => {
    load();
    // New orders should appear without the owner refreshing the page.
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function toggleOpen(o: Order) {
    const next = open === o.id ? null : o.id;
    setOpen(next);
    if (next && !items[o.id]) {
      const { data } = await supabase
        .from("pp_order_items")
        .select("*")
        .eq("order_id", o.id);
      setItems((m) => ({ ...m, [o.id]: (data ?? []) as OrderItem[] }));
    }
  }

  async function setStatus(o: Order, status: OrderStatus) {
    setBusyId(o.id);
    setError(null);
    const { error: err } = await supabase
      .from("pp_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", o.id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  const view = useMemo(() => {
    const list = orders ?? [];
    return filter === "open"
      ? list.filter((o) => o.status !== "delivered" && o.status !== "cancelled")
      : list;
  }, [orders, filter]);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const list = (orders ?? []).filter(
      (o) => new Date(o.created_at) >= start && o.status !== "cancelled"
    );
    return {
      count: list.length,
      sales: list.reduce((s, o) => s + Number(o.total), 0),
      pending: (orders ?? []).filter((o) => o.status === "new").length,
    };
  }, [orders]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-950">Orders</h1>
          <p className="text-sm text-emerald-900/50">
            New orders appear here automatically — you also get an SMS alert.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-emerald-100 bg-white p-1">
          {(["open", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize ${
                filter === f ? "bg-emerald-950 text-white" : "text-emerald-900/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          ["Orders today", String(today.count)],
          ["Sales today", cedis(today.sales)],
          ["Awaiting confirmation", String(today.pending)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-emerald-900/50">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-950 sm:text-2xl">
              {value}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      {/* Order list */}
      <div className="mt-5 space-y-3">
        {orders === null ? (
          <p className="py-16 text-center text-emerald-900/40">Loading orders…</p>
        ) : view.length === 0 ? (
          <p className="rounded-2xl border border-emerald-100 bg-white py-16 text-center text-emerald-900/40">
            {filter === "open"
              ? "No open orders right now. 🎉"
              : "No orders yet — they'll appear here as customers buy."}
          </p>
        ) : (
          view.map((o) => (
            <div
              key={o.id}
              className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm"
            >
              <button
                onClick={() => toggleOpen(o)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left"
              >
                <span className="font-mono text-sm font-bold text-emerald-700">
                  {o.code}
                </span>
                <span className="font-bold text-emerald-950">{o.customer_name}</span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${STATUS_STYLE[o.status]}`}
                >
                  {STATUS_LABELS[o.status]}
                </span>
                <span className="ml-auto text-sm text-emerald-900/50">
                  {timeAgo(o.created_at)}
                </span>
                <b className="text-emerald-950">{cedis(o.total)}</b>
                <span
                  className={`text-xs font-bold text-emerald-700 transition-transform ${
                    open === o.id ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  ▼
                </span>
              </button>

              {open === o.id && (
                <div className="border-t border-emerald-50 px-5 py-4">
                  <div className="grid gap-1 text-sm text-emerald-900/80">
                    <p>
                      📞{" "}
                      <a className="font-bold" href={`tel:${o.phone}`}>
                        {o.phone}
                      </a>{" "}
                      ·{" "}
                      <a
                        className="font-bold text-emerald-700 underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        href={waLink(
                          o.phone,
                          `Hello ${o.customer_name.split(" ")[0]}, this is Prep & Pantry about your order ${o.code}. `
                        )}
                      >
                        WhatsApp
                      </a>
                    </p>
                    <p>📍 {o.address}</p>
                    {o.note && <p>📝 {o.note}</p>}
                    <p className="text-emerald-900/50">🕐 {fullDateTime(o.created_at)}</p>
                  </div>

                  <div className="mt-3 rounded-xl bg-emerald-50/60 px-4 py-3">
                    {!items[o.id] ? (
                      <p className="text-sm text-emerald-900/40">Loading items…</p>
                    ) : (
                      <ul className="grid gap-1 text-sm">
                        {items[o.id].map((it) => (
                          <li key={it.id} className="flex justify-between gap-3">
                            <span>
                              {it.product_name}{" "}
                              <span className="text-emerald-900/50">
                                × {Number(it.quantity)}
                              </span>
                            </span>
                            <b>{cedis(it.line_total)}</b>
                          </li>
                        ))}
                        <li className="mt-1 flex justify-between border-t border-emerald-100 pt-2 font-extrabold">
                          <span>Total</span>
                          <span>{cedis(o.total)}</span>
                        </li>
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {NEXT_STEP[o.status] && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => setStatus(o, NEXT_STEP[o.status]!.to)}
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {NEXT_STEP[o.status]!.label}
                      </button>
                    )}
                    {o.status !== "delivered" && o.status !== "cancelled" && (
                      <button
                        disabled={busyId === o.id}
                        onClick={() => setStatus(o, "cancelled")}
                        className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        Cancel order
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
