# Prep & Pantry — online grocery shop

Good food. Your way. Delivered. An online shop where customers browse groceries,
add to cart and order — and the owner gets notified and manages products, prices
and orders from a private dashboard.

## Stack

- Next.js (app router) + Tailwind CSS
- Supabase (Postgres + RLS + auth) — tables prefixed `pp_`, sharing the same
  Supabase project as the K&A Laundry site

## One-time setup

1. **Database** — open the Supabase dashboard → SQL Editor, paste
   [supabase/2026-07-27-prep-pantry-schema.sql](supabase/2026-07-27-prep-pantry-schema.sql)
   and Run. Before running, change the setup code (`PREP-SETUP-2026`) to
   something private. The script creates the tables, security rules and the
   full starter product list.
2. **Owner account** — visit `/admin/login` → “First time? Set up the admin
   account”, sign up with the owner's email and the setup code. The first
   account to claim becomes the owner (can edit products and prices); later
   claims join as staff (orders only).
3. **SMS alerts (optional)** — the owner already sees every order on the
   dashboard. To also get an SMS per order, add to `.env.local` (and to the
   hosting provider's env settings):

   ```
   SMS_PROVIDER=mnotify        # or arkesel
   SMS_API_KEY=...
   SMS_SENDER_ID=PrepPantry
   OWNER_ALERT_PHONE=233241028038
   ```

## Develop

```
npm run dev
```

- Shop: http://localhost:3000
- Owner dashboard: http://localhost:3000/admin

## How ordering works

Customers don't need an account. The cart lives in the browser; checkout posts
to `/api/place-order`, which calls the `pp_place_order` RPC — prices are looked
up server-side, so the client can never set its own prices — then texts the
owner (if SMS is configured). Payment is on delivery (cash or MoMo).
