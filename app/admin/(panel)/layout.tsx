"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BUSINESS_NAME } from "@/lib/config";

const NAV = [
  { href: "/admin", label: "Orders", icon: "🧾" },
  { href: "/admin/customers", label: "Customers", icon: "👤" },
  { href: "/admin/products", label: "Products & prices", icon: "🏷️", ownerOnly: true },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "denied" | "ok">("checking");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/admin/login");
        return;
      }
      const { data } = await supabase
        .from("pp_admins")
        .select("user_id, is_owner")
        .eq("user_id", user.id)
        .maybeSingle();
      setState(data ? "ok" : "denied");
      setIsOwner(!!data?.is_owner);
    })();
  }, [router]);

  const nav = NAV.filter((item) => !item.ownerOnly || isOwner);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-emerald-50/40 text-emerald-900/40">
        Checking access…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center bg-emerald-50/40 px-4">
        <div className="max-w-sm text-center">
          <p className="text-lg font-bold text-emerald-950">
            This account isn&apos;t a staff account.
          </p>
          <p className="mt-2 text-sm text-emerald-900/50">
            If you&apos;re setting up for the first time, use the admin setup
            code on the login page.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-xl bg-emerald-950 px-6 py-3 font-bold text-white"
          >
            Switch account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-emerald-50/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-emerald-100 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-emerald-50 px-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm">
            🧺
          </span>
          <span className="font-extrabold tracking-tight text-emerald-950">
            {BUSINESS_NAME}
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-emerald-950 text-white"
                    : "text-emerald-900/50 hover:bg-emerald-50 hover:text-emerald-950"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-900/50 transition hover:bg-emerald-50 hover:text-emerald-950"
          >
            <span className="text-base">🛍️</span>
            View the shop
          </Link>
        </nav>
        <div className="border-t border-emerald-50 p-3">
          <button
            onClick={signOut}
            className="w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-emerald-900/50 transition hover:bg-emerald-50 hover:text-emerald-950"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-1 overflow-x-auto border-b border-emerald-100 bg-white px-3 md:hidden">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                active ? "bg-emerald-950 text-white" : "text-emerald-900/50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap text-emerald-900/50"
        >
          Sign out
        </button>
      </div>

      <main className="w-full flex-1 px-4 pt-20 pb-12 sm:px-8 md:ml-60 md:pt-8">
        {children}
      </main>
    </div>
  );
}
