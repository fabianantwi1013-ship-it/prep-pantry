"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { BUSINESS_NAME } from "@/lib/config";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "setup">("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Supabase errors aren't always Error instances; dig the message out of
  // whatever shape arrives so the user never sees "{}".
  function messageOf(err: unknown): string {
    if (err instanceof Error && err.message) return err.message;
    if (err && typeof err === "object" && "message" in err) {
      const m = (err as { message?: unknown }).message;
      if (typeof m === "string" && m) return m;
    }
    return "Could not sign in. Check your connection and try again.";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    // Phone keyboards add stray spaces after autofill; they break sign-in.
    const email = form.email.trim();
    const password = form.password.trim();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/admin");
      } else {
        // First-time setup: get a session (existing account signs in, new one
        // signs up), then claim admin with the setup code.
        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          const signIn = await supabase.auth.signInWithPassword({ email, password });
          if (signIn.data.session) {
            session = signIn.data.session;
          } else {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${window.location.origin}/admin/login`,
              },
            });
            if (error) throw error;
            session = data.session;
          }
        }
        if (!session) {
          setNotice(
            "Check your email for a confirmation link, then come back to this page, switch to “Set up admin,” and enter the same details plus the code to finish."
          );
          return;
        }
        const { error: claimErr } = await supabase.rpc("pp_claim_admin", {
          p_code: form.code.trim(),
          p_name: form.name,
        });
        if (claimErr) throw claimErr;
        router.push("/admin");
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-emerald-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-3xl">
            🧺
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            {BUSINESS_NAME} Admin
          </h1>
          <p className="mt-1 text-sm text-emerald-100/60">
            {mode === "signin"
              ? "Sign in to the dashboard"
              : "First-time setup — you need the admin setup code"}
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-white p-6 shadow-xl">
          {mode === "setup" && (
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Your name"
            />
          )}
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
            placeholder="Email"
          />
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
            placeholder="Password"
          />
          {mode === "setup" && (
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-xl border border-slate-200 px-4 py-3 font-mono outline-none focus:border-emerald-400"
              placeholder="Admin setup code"
            />
          )}

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-emerald-950 px-6 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Set up admin"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "setup" : "signin")}
          className="mt-4 w-full text-center text-sm font-semibold text-emerald-100/60 hover:text-white"
        >
          {mode === "signin"
            ? "First time? Set up the admin account"
            : "Already set up? Sign in"}
        </button>
      </div>
    </div>
  );
}
