"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Product } from "@/lib/supabase";
import { cedis, waLink } from "@/lib/format";
import {
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
  BUSINESS_MOTTO,
  BUSINESS_PHONE,
  BUSINESS_WHATSAPP,
  BUSINESS_INSTAGRAM,
} from "@/lib/config";

type CartLine = { product: Product; qty: number };
type Placed = { code: string; total: number };

const CART_KEY = "pp-cart";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [drawer, setDrawer] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("pp_products")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) setLoadError(true);
        setProducts((data ?? []) as Product[]);
      });
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
      if (saved && typeof saved === "object") setCart(saved);
    } catch {
      // ignore a corrupt saved cart
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set((products ?? []).map((p) => p.category)))],
    [products]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (category === "All" || p.category === category) &&
        p.name.toLowerCase().includes(q)
    );
  }, [products, category, query]);

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = (products ?? []).find((p) => p.id === id);
          return product ? { product, qty } : null;
        })
        .filter(Boolean) as CartLine[],
    [cart, products]
  );

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * Number(l.product.price), 0);

  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    setOrderError(null);
    try {
      const res = await fetch("/api/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: lines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Could not place the order.");
      setPlaced({ code: j.code, total: j.total });
      setCart({});
      setCheckout(false);
    } catch (err) {
      setOrderError(
        err instanceof Error ? err.message : "Could not place the order. Try again."
      );
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-xl">
              🧺
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight text-emerald-950">
                {BUSINESS_NAME}
              </span>
              <span className="hidden text-[10px] font-bold tracking-widest text-emerald-600 uppercase sm:block">
                {BUSINESS_TAGLINE}
              </span>
            </span>
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
            <span aria-hidden>🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rice, tomatoes, yam…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-emerald-900/40"
            />
          </div>
          <button
            onClick={() => {
              setPlaced(null);
              setDrawer(true);
            }}
            className="relative flex items-center gap-2 rounded-full bg-emerald-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900"
          >
            🛒 <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-amber-500 px-1 text-xs font-extrabold">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="flex items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-600 px-8 py-9 text-white shadow-lg shadow-emerald-900/10">
          <div>
            <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">
              Your groceries. Our prep.
              <br />
              Delivered to you.
            </h1>
            <p className="mt-2 max-w-md text-sm text-emerald-50/85 sm:text-[15px]">
              Shop your daily essentials, fresh produce, pantry staples and more
              from the comfort of your home. We pick, pack and deliver with care.
            </p>
            <button
              onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-emerald-950 transition hover:bg-emerald-50"
            >
              Shop now ↓
            </button>
          </div>
          <div className="hidden text-6xl drop-shadow-lg sm:block" aria-hidden>
            🥕🍅🥚
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="mx-auto mt-4 grid max-w-6xl gap-3 px-4 sm:grid-cols-3">
        {[
          ["🛒", "Wide selection", "Quality food items and household essentials."],
          ["🏅", "Quality you can trust", "Carefully selected products for your family."],
          ["🚚", "Fast & reliable delivery", "Fresh and on time, right to your doorstep."],
        ].map(([icon, title, body]) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl">
              {icon}
            </span>
            <span>
              <b className="block text-sm text-emerald-950">{title}</b>
              <small className="text-xs leading-tight text-emerald-900/60">{body}</small>
            </span>
          </div>
        ))}
      </section>

      {/* Categories */}
      <nav className="mx-auto mt-6 flex max-w-6xl gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4.5 py-2 text-sm font-semibold whitespace-nowrap transition ${
              c === category
                ? "border-emerald-950 bg-emerald-950 text-white"
                : "border-emerald-100 bg-white text-emerald-900/60 hover:border-emerald-300"
            }`}
          >
            {c}
          </button>
        ))}
      </nav>

      {/* Product grid */}
      <main
        ref={gridRef}
        className="mx-auto mt-4 grid max-w-6xl scroll-mt-24 grid-cols-2 gap-3 px-4 pb-16 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
      >
        {products === null ? (
          <p className="col-span-full py-16 text-center text-emerald-900/50">
            Loading fresh stock…
          </p>
        ) : loadError ? (
          <p className="col-span-full py-16 text-center text-emerald-900/50">
            The shop can&apos;t be reached right now. Please refresh, or call us on{" "}
            {BUSINESS_PHONE}.
          </p>
        ) : visible.length === 0 ? (
          <p className="col-span-full py-16 text-center text-emerald-900/50">
            No products match your search.
          </p>
        ) : (
          visible.map((p) => {
            const qty = cart[p.id] || 0;
            return (
              <article
                key={p.id}
                className={`flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  p.in_stock ? "" : "opacity-55"
                }`}
              >
                <div className="grid h-20 place-items-center rounded-xl bg-emerald-50 text-4xl">
                  {p.emoji}
                </div>
                <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                  {p.category}
                </span>
                <h2 className="-mt-1 text-sm leading-tight font-bold text-emerald-950">
                  {p.name}
                </h2>
                <span className="-mt-1 text-xs text-emerald-900/50">{p.unit}</span>
                <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                  <span className="text-sm font-extrabold text-emerald-950 sm:text-base">
                    {cedis(p.price)}
                  </span>
                  {!p.in_stock ? (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-400">
                      Out of stock
                    </span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      ＋ Add
                    </button>
                  ) : (
                    <span className="flex items-center gap-2 rounded-lg bg-emerald-50 px-1.5 py-1">
                      <button
                        onClick={() => setQty(p.id, qty - 1)}
                        className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 font-extrabold text-white"
                        aria-label={`Remove one ${p.name}`}
                      >
                        −
                      </button>
                      <b className="min-w-4 text-center text-sm">{qty}</b>
                      <button
                        onClick={() => setQty(p.id, qty + 1)}
                        className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 font-extrabold text-white"
                        aria-label={`Add one ${p.name}`}
                      >
                        ＋
                      </button>
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-50/85">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold text-white">🧺 {BUSINESS_NAME}</p>
            <p className="mt-1.5 text-sm">{BUSINESS_TAGLINE}</p>
          </div>
          <div>
            <b className="text-sm text-white">Contact us</b>
            <p className="mt-1.5 text-sm leading-7">
              📞 <a href={`tel:${BUSINESS_PHONE.replace(/\s/g, "")}`}>{BUSINESS_PHONE}</a>
              <br />
              💬{" "}
              <a
                href={waLink(BUSINESS_WHATSAPP, "Hello Prep & Pantry! ")}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                WhatsApp us anytime
              </a>
            </p>
          </div>
          <div>
            <b className="text-sm text-white">Follow us</b>
            <p className="mt-1.5 text-sm leading-7">
              📸{" "}
              <a
                href={`https://instagram.com/${BUSINESS_INSTAGRAM}`}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                @{BUSINESS_INSTAGRAM}
              </a>
              <br />ⓕ {BUSINESS_NAME}
            </p>
          </div>
          <div>
            <b className="text-sm text-white">{BUSINESS_MOTTO}</b>
            <p className="mt-1.5 text-sm">
              We deliver convenience — you enjoy more time for what matters.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-emerald-50/50">
            <span>
              © {new Date().getFullYear()} {BUSINESS_NAME}
            </span>
            <a href="/admin" className="underline-offset-2 hover:text-white hover:underline">
              Owner login
            </a>
          </div>
        </div>
      </footer>

      {/* Cart drawer */}
      {drawer && (
        <div
          className="fixed inset-0 z-50 bg-emerald-950/45"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-105 transform flex-col bg-white shadow-2xl transition-transform duration-300 ${
          drawer ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!drawer}
      >
        <header className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
          <h2 className="text-lg font-extrabold text-emerald-950">
            {placed ? "Order placed" : checkout ? "Checkout" : "Your cart"}
          </h2>
          <button
            onClick={() => setDrawer(false)}
            className="px-2 text-xl text-emerald-900/40 hover:text-emerald-950"
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {placed ? (
            <div className="px-2 py-10 text-center">
              <div className="text-6xl">✅</div>
              <h3 className="mt-3 text-xl font-extrabold text-emerald-950">
                Order {placed.code} sent!
              </h3>
              <p className="mt-2 text-sm text-emerald-900/60">
                Thank you for shopping with {BUSINESS_NAME}! We&apos;ve received
                your order of {cedis(placed.total)} and will call you shortly to
                confirm delivery. You pay on delivery — cash or MoMo.
              </p>
              <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900">
                🔔 The shop has been notified
              </p>
              <p className="mt-4 text-sm text-emerald-900/60">
                Questions? Call us on{" "}
                <a className="font-bold" href={`tel:${BUSINESS_PHONE.replace(/\s/g, "")}`}>
                  {BUSINESS_PHONE}
                </a>
              </p>
            </div>
          ) : lines.length === 0 ? (
            <div className="px-2 py-16 text-center text-emerald-900/50">
              <div className="mb-2 text-5xl">🛒</div>
              Your cart is empty.
              <br />
              Add some fresh items!
            </div>
          ) : checkout ? (
            <form id="checkout-form" onSubmit={placeOrder} className="grid gap-3 py-1">
              <p className="rounded-xl bg-amber-100 px-4 py-2.5 text-[13px] text-amber-900">
                💡 No payment online — you pay <b>on delivery</b> (cash or MoMo).
                We just need your details to reach you.
              </p>
              <label className="grid gap-1 text-[13px] font-bold text-emerald-950">
                Your name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Akosua Mensah"
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-emerald-400"
                />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-emerald-950">
                Phone number
                <input
                  required
                  type="tel"
                  minLength={9}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 024 000 0000"
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-emerald-400"
                />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-emerald-950">
                Delivery address / landmark
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Adenta, near the filling station"
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-emerald-400"
                />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-emerald-950">
                Note for the shop (optional)
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. call before coming"
                  className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-emerald-400"
                />
              </label>
              {orderError && (
                <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                  {orderError}
                </p>
              )}
            </form>
          ) : (
            lines.map(({ product: p, qty }) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-emerald-50 py-3"
              >
                <span className="grid h-13 w-13 shrink-0 place-items-center rounded-xl bg-emerald-50 text-2xl">
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-emerald-950">{p.name}</b>
                  <small className="text-xs text-emerald-900/50">
                    {cedis(p.price)} · {p.unit}
                  </small>
                </span>
                <span className="flex items-center gap-2 rounded-lg bg-emerald-50 px-1.5 py-1">
                  <button
                    onClick={() => setQty(p.id, qty - 1)}
                    className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 font-extrabold text-white"
                  >
                    −
                  </button>
                  <b className="min-w-4 text-center text-sm">{qty}</b>
                  <button
                    onClick={() => setQty(p.id, qty + 1)}
                    className="grid h-6 w-6 place-items-center rounded-md bg-emerald-600 font-extrabold text-white"
                  >
                    ＋
                  </button>
                </span>
                <b className="w-20 text-right text-sm text-emerald-950">
                  {cedis(Number(p.price) * qty)}
                </b>
              </div>
            ))
          )}
        </div>

        {!placed && lines.length > 0 && (
          <footer className="border-t border-emerald-100 px-5 py-4">
            <div className="mb-1 flex justify-between text-sm text-emerald-900/60">
              <span>Items ({count})</span>
              <span>{cedis(total)}</span>
            </div>
            <div className="mb-3 flex justify-between text-sm text-emerald-900/60">
              <span>Delivery</span>
              <span>Confirmed by phone</span>
            </div>
            <div className="mb-4 flex justify-between text-lg font-extrabold text-emerald-950">
              <span>Total</span>
              <span>{cedis(total)}</span>
            </div>
            {checkout ? (
              <button
                type="submit"
                form="checkout-form"
                disabled={placing}
                className="w-full rounded-xl bg-emerald-600 py-3.5 font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {placing ? "Sending your order…" : "Place order · notify shop 🔔"}
              </button>
            ) : (
              <button
                onClick={() => setCheckout(true)}
                className="w-full rounded-xl bg-emerald-600 py-3.5 font-extrabold text-white transition hover:bg-emerald-700"
              >
                Checkout →
              </button>
            )}
          </footer>
        )}
        {placed && (
          <footer className="border-t border-emerald-100 px-5 py-4">
            <button
              onClick={() => {
                setDrawer(false);
                setPlaced(null);
              }}
              className="w-full rounded-xl bg-emerald-600 py-3.5 font-extrabold text-white transition hover:bg-emerald-700"
            >
              Continue shopping
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
