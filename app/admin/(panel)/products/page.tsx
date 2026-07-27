"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Product } from "@/lib/supabase";
import { cedis } from "@/lib/format";

// What the owner has typed into a row but not yet saved.
type Draft = { name: string; price: string };

const EMPTY_NEW = {
  name: "",
  category: "",
  unit: "",
  price: "",
  emoji: "",
};

export default function AdminProductsPage() {
  const [access, setAccess] = useState<"checking" | "staff" | "owner">("checking");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftNew, setDraftNew] = useState(EMPTY_NEW);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pp_products")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("pp_admins")
        .select("is_owner")
        .eq("user_id", user.id)
        .maybeSingle();
      setAccess(data?.is_owner ? "owner" : "staff");
    });
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.category))),
    [products]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter(
      (p) => (showRemoved || p.active) && p.name.toLowerCase().includes(q)
    );
  }, [products, query, showRemoved]);

  function draftFor(p: Product): Draft {
    return drafts[p.id] ?? { name: p.name, price: String(Number(p.price)) };
  }

  function setDraft(p: Product, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [p.id]: { ...draftFor(p), ...patch } }));
  }

  function isDirty(p: Product) {
    const d = drafts[p.id];
    if (!d) return false;
    return d.name.trim() !== p.name || Number(d.price) !== Number(p.price);
  }

  async function save(p: Product) {
    const d = draftFor(p);
    const name = d.name.trim();
    const price = Number(d.price);
    if (!name) {
      setError("The item needs a name.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError(`Enter a valid price for ${name}.`);
      return;
    }
    setSavingId(p.id);
    setError(null);
    const { error: err } = await supabase
      .from("pp_products")
      .update({ name, price })
      .eq("id", p.id);
    setSavingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    setNotice(
      Number(p.price) !== price
        ? `${name}: ${cedis(Number(p.price))} → ${cedis(price)}. Customers see the new price immediately.`
        : `Renamed to “${name}”.`
    );
    load();
  }

  async function toggle(p: Product, field: "in_stock" | "active") {
    setSavingId(p.id);
    setError(null);
    const { error: err } = await supabase
      .from("pp_products")
      .update({ [field]: !p[field] })
      .eq("id", p.id);
    setSavingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setNotice(
      field === "in_stock"
        ? p.in_stock
          ? `“${p.name}” marked out of stock.`
          : `“${p.name}” is back in stock.`
        : p.active
          ? `Removed “${p.name}” from the shop.`
          : `“${p.name}” is back in the shop.`
    );
    load();
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(draftNew.price);
    if (!draftNew.name.trim() || !Number.isFinite(price) || price <= 0) {
      setError("A new product needs a name and a valid price.");
      return;
    }
    setError(null);
    const { error: err } = await supabase.from("pp_products").insert({
      name: draftNew.name.trim(),
      category: draftNew.category.trim() || "Other",
      unit: draftNew.unit.trim() || "each",
      price,
      emoji: draftNew.emoji.trim() || "🛍️",
      sort_order: 999,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNotice(`“${draftNew.name.trim()}” added — it is now live in the shop.`);
    setDraftNew(EMPTY_NEW);
    setAdding(false);
    load();
  }

  if (access === "staff") {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="text-lg font-bold text-emerald-950">Owner only</p>
        <p className="mt-2 text-sm text-emerald-900/50">
          Only the shop owner can change products and prices.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-emerald-950">
            Products &amp; prices
          </h1>
          <p className="text-sm text-emerald-900/50">
            Changes go live in the shop the moment you save.
          </p>
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          {adding ? "Close" : "＋ Add product"}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={addProduct}
          className="mt-4 grid gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <input
            required
            value={draftNew.name}
            onChange={(e) => setDraftNew({ ...draftNew, name: e.target.value })}
            placeholder="Product name, e.g. Sardines (tin)"
            className="rounded-xl border border-emerald-100 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 sm:col-span-2"
          />
          <input
            list="pp-categories"
            value={draftNew.category}
            onChange={(e) => setDraftNew({ ...draftNew, category: e.target.value })}
            placeholder="Category, e.g. Canned & Packaged"
            className="rounded-xl border border-emerald-100 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          />
          <datalist id="pp-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            value={draftNew.unit}
            onChange={(e) => setDraftNew({ ...draftNew, unit: e.target.value })}
            placeholder="Unit, e.g. per tin"
            className="rounded-xl border border-emerald-100 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          />
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={draftNew.price}
            onChange={(e) => setDraftNew({ ...draftNew, price: e.target.value })}
            placeholder="Price (GH₵)"
            className="rounded-xl border border-emerald-100 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          />
          <input
            value={draftNew.emoji}
            onChange={(e) => setDraftNew({ ...draftNew, emoji: e.target.value })}
            maxLength={4}
            placeholder="Emoji photo, e.g. 🐟"
            className="rounded-xl border border-emerald-100 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 sm:col-span-2"
          >
            Add to shop
          </button>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-xs rounded-xl border border-emerald-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900/60">
          <input
            type="checkbox"
            checked={showRemoved}
            onChange={(e) => setShowRemoved(e.target.checked)}
          />
          Show removed items
        </label>
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <table className="w-full min-w-155 text-sm">
          <thead>
            <tr className="border-b border-emerald-50 bg-emerald-50/50 text-left text-[11px] tracking-wider text-emerald-900/50 uppercase">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price (GH₵)</th>
              <th className="px-4 py-3">In stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-emerald-900/40">
                  Loading products…
                </td>
              </tr>
            ) : (
              visible.map((p) => {
                const d = draftFor(p);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-emerald-50 last:border-0 ${
                      p.active ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{p.emoji}</span>
                        <input
                          value={d.name}
                          onChange={(e) => setDraft(p, { name: e.target.value })}
                          className="w-full min-w-40 rounded-lg border border-transparent px-2 py-1.5 font-semibold outline-none hover:border-emerald-100 focus:border-emerald-400"
                        />
                      </div>
                      <span className="pl-9 text-xs text-emerald-900/40">{p.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-emerald-900/60">{p.category}</td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.price}
                        onChange={(e) => setDraft(p, { price: e.target.value })}
                        className="w-24 rounded-lg border border-emerald-100 px-2.5 py-1.5 text-right font-bold outline-none focus:border-emerald-400"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggle(p, "in_stock")}
                        disabled={savingId === p.id}
                        aria-label={`Toggle stock for ${p.name}`}
                        className={`relative h-6 w-11 rounded-full transition ${
                          p.in_stock ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                            p.in_stock ? "left-5.5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {isDirty(p) && (
                        <button
                          onClick={() => save(p)}
                          disabled={savingId === p.id}
                          className="mr-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {savingId === p.id ? "Saving…" : "Save"}
                        </button>
                      )}
                      <button
                        onClick={() => toggle(p, "active")}
                        disabled={savingId === p.id}
                        className="text-xs font-bold text-emerald-900/40 hover:text-rose-500"
                      >
                        {p.active ? "Remove" : "Restore"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
