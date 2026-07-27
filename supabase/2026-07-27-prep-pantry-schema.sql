-- Prep & Pantry — full database setup.
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- All objects are prefixed pp_ so they live safely beside the ka_ (laundry) tables.
--
-- IMPORTANT: change the setup code below (search for PREP-SETUP-2026) before
-- running, then share it only with the shop owner.

-- ---------------------------------------------------------------- products
create table if not exists pp_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  unit text not null default 'each',
  price numeric not null check (price >= 0),
  emoji text not null default '🛍️',
  in_stock boolean not null default true,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create sequence if not exists pp_order_code_seq start 1001;

create table if not exists pp_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PP-' || nextval('pp_order_code_seq')),
  customer_name text not null,
  phone text not null,
  address text not null,
  note text,
  status text not null default 'new'
    check (status in ('new','confirmed','out_for_delivery','delivered','cancelled')),
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pp_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references pp_orders (id) on delete cascade,
  product_id uuid references pp_products (id) on delete set null,
  product_name text not null,
  unit text not null default 'each',
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null,
  line_total numeric not null
);

-- ---------------------------------------------------------------- admins
create table if not exists pp_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

-- Security-definer helpers so RLS policies can check admin status without
-- recursing into pp_admins' own policies.
create or replace function public.pp_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from pp_admins where user_id = auth.uid()) $$;

create or replace function public.pp_is_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from pp_admins where user_id = auth.uid() and is_owner) $$;

-- ---------------------------------------------------------------- RLS
alter table pp_products enable row level security;
alter table pp_orders enable row level security;
alter table pp_order_items enable row level security;
alter table pp_admins enable row level security;

-- Products: anyone can read active ones; admins read all; only the owner edits.
drop policy if exists pp_products_public_read on pp_products;
create policy pp_products_public_read on pp_products
  for select using (active or pp_is_admin());

drop policy if exists pp_products_owner_write on pp_products;
create policy pp_products_owner_write on pp_products
  for all using (pp_is_owner()) with check (pp_is_owner());

-- Orders: admins only (customers create orders through the pp_place_order RPC).
drop policy if exists pp_orders_admin_read on pp_orders;
create policy pp_orders_admin_read on pp_orders
  for select using (pp_is_admin());

drop policy if exists pp_orders_admin_update on pp_orders;
create policy pp_orders_admin_update on pp_orders
  for update using (pp_is_admin()) with check (pp_is_admin());

drop policy if exists pp_order_items_admin_read on pp_order_items;
create policy pp_order_items_admin_read on pp_order_items
  for select using (pp_is_admin());

-- Admins: each admin sees the list (needed for the gate check).
drop policy if exists pp_admins_read on pp_admins;
create policy pp_admins_read on pp_admins
  for select using (pp_is_admin());

-- ---------------------------------------------------------------- RPCs

-- First-time staff setup with a shared code. The first person to claim
-- becomes the owner; later claims join as regular staff.
create or replace function public.pp_claim_admin(p_code text, p_name text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_code is distinct from 'PREP-SETUP-2026' then
    raise exception 'That setup code is not correct.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  insert into pp_admins (user_id, name, email, is_owner)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_name), ''), 'Staff'),
    (select email from auth.users where id = auth.uid()),
    not exists (select 1 from pp_admins)
  )
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.pp_claim_admin(text, text) from public, anon;
grant execute on function public.pp_claim_admin(text, text) to authenticated;

-- Places a customer order. Prices are looked up server-side so the client
-- can never invent its own. Items arrive as [{"product_id": "...", "quantity": 2}].
create or replace function public.pp_place_order(
  p_name text,
  p_phone text,
  p_address text,
  p_note text,
  p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_total numeric := 0;
  v_count int := 0;
  item record;
begin
  if nullif(trim(p_name), '') is null
     or nullif(trim(p_phone), '') is null
     or nullif(trim(p_address), '') is null then
    raise exception 'Name, phone and delivery address are required.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart is empty.';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items in one order.';
  end if;

  insert into pp_orders (customer_name, phone, address, note)
  values (trim(p_name), trim(p_phone), trim(p_address), nullif(trim(coalesce(p_note, '')), ''))
  returning id, code into v_order_id, v_code;

  for item in
    select p.id, p.name, p.unit, p.price, p.in_stock, p.active,
           least(greatest(coalesce((e.value ->> 'quantity')::numeric, 1), 1), 999) as qty
    from jsonb_array_elements(p_items) e
    join pp_products p on p.id = (e.value ->> 'product_id')::uuid
  loop
    if not item.active or not item.in_stock then
      raise exception '"%" is currently out of stock.', item.name;
    end if;
    insert into pp_order_items
      (order_id, product_id, product_name, unit, quantity, unit_price, line_total)
    values
      (v_order_id, item.id, item.name, item.unit, item.qty, item.price, item.qty * item.price);
    v_total := v_total + item.qty * item.price;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'The cart is empty.';
  end if;

  update pp_orders set total = v_total where id = v_order_id;

  return jsonb_build_object('id', v_order_id, 'code', v_code, 'total', v_total, 'items', v_count);
end;
$$;

grant execute on function public.pp_place_order(text, text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- seed products
insert into pp_products (name, category, unit, price, emoji, sort_order) values
  ('Rice (5kg bag)',        'Staples & Grains', '5kg bag',      120, '🍚', 10),
  ('Gari (2kg)',            'Staples & Grains', '2kg pack',      28, '🥣', 11),
  ('Beans',                 'Staples & Grains', 'per olonka',    25, '🫘', 12),
  ('Flour (2kg)',           'Staples & Grains', '2kg pack',      30, '🌾', 13),
  ('Spaghetti',             'Staples & Grains', 'per pack',       8, '🍝', 14),
  ('Indomie (carton)',      'Staples & Grains', '40 packs',      75, '🍜', 15),
  ('Fresh Tomatoes',        'Vegetables',       'per basket',    15, '🍅', 20),
  ('Onions',                'Vegetables',       'per bag',       12, '🧅', 21),
  ('Fresh Pepper',          'Vegetables',       'per bowl',      10, '🌶️', 22),
  ('Garden Eggs',           'Vegetables',       'per bowl',      12, '🍆', 23),
  ('Cabbage',               'Vegetables',       'each',          10, '🥬', 24),
  ('Carrots',               'Vegetables',       'per bundle',     8, '🥕', 25),
  ('Bananas',               'Fruits',           'per bunch',     12, '🍌', 30),
  ('Oranges',               'Fruits',           '10 pieces',     10, '🍊', 31),
  ('Pineapple',             'Fruits',           'each',          15, '🍍', 32),
  ('Watermelon',            'Fruits',           'each',          25, '🍉', 33),
  ('Mango',                 'Fruits',           'each',           8, '🥭', 34),
  ('Apples',                'Fruits',           '3 pieces',      20, '🍎', 35),
  ('Frozen Chicken',        'Meat & Poultry',   'per kg',        48, '🍗', 40),
  ('Beef',                  'Meat & Poultry',   'per kg',        60, '🥩', 41),
  ('Goat Meat',             'Meat & Poultry',   'per kg',        70, '🍖', 42),
  ('Sausages',              'Meat & Poultry',   'per pack',      35, '🌭', 43),
  ('Fresh Tilapia',         'Fish & Seafood',   'per kg',        45, '🐟', 50),
  ('Smoked Herrings',       'Fish & Seafood',   '5 pieces',      20, '🐠', 51),
  ('Sardines (tin)',        'Fish & Seafood',   'per tin',       12, '🥫', 52),
  ('Shrimps',               'Fish & Seafood',   'per pack',      55, '🦐', 53),
  ('Eggs (crate)',          'Dairy & Eggs',     '30 pieces',     55, '🥚', 60),
  ('Fresh Milk (1L)',       'Dairy & Eggs',     '1 litre',       30, '🥛', 61),
  ('Evaporated Milk',       'Dairy & Eggs',     'per tin',       15, '🥫', 62),
  ('Yoghurt',               'Dairy & Eggs',     'per bottle',    12, '🍦', 63),
  ('Butter',                'Dairy & Eggs',     '250g',          35, '🧈', 64),
  ('Cheese',                'Dairy & Eggs',     '250g',          45, '🧀', 65),
  ('Bread (loaf)',          'Bakery',           'per loaf',      18, '🍞', 70),
  ('Meat Pie',              'Bakery',           'each',          10, '🥧', 71),
  ('Croissant',             'Bakery',           'each',          15, '🥐', 72),
  ('Doughnuts',             'Bakery',           '6 pieces',      20, '🍩', 73),
  ('Milo (400g)',           'Beverages',        '400g tin',      42, '🥤', 80),
  ('Bottled Water (pack)',  'Beverages',        '12 × 750ml',    22, '💧', 81),
  ('Soft Drinks (pack)',    'Beverages',        '12 bottles',    45, '🥤', 82),
  ('Fruit Juice (1L)',      'Beverages',        '1 litre',       25, '🧃', 83),
  ('Lipton Tea',            'Beverages',        '50 bags',       18, '🍵', 84),
  ('Coffee (200g)',         'Beverages',        '200g jar',      38, '☕', 85),
  ('Palm Oil (1L)',         'Oils & Spices',    '1 litre',       35, '🫙', 90),
  ('Vegetable Oil (1L)',    'Oils & Spices',    '1 litre',       40, '🫒', 91),
  ('Tomato Paste',          'Oils & Spices',    'per tin',        8, '🥫', 92),
  ('Shito',                 'Oils & Spices',    'per jar',       25, '🌶️', 93),
  ('Maggi Cubes',           'Oils & Spices',    'per pack',      12, '🧂', 94),
  ('Salt (1kg)',            'Oils & Spices',    '1kg pack',       5, '🧂', 95),
  ('Baked Beans',           'Canned & Packaged','per tin',       15, '🥫', 100),
  ('Corned Beef',           'Canned & Packaged','per tin',       30, '🥫', 101),
  ('Cornflakes',            'Canned & Packaged','500g box',      35, '🥣', 102),
  ('Tuna (tin)',            'Canned & Packaged','per tin',       18, '🥫', 103),
  ('Biscuits',              'Snacks & Sweets',  'per pack',      10, '🍪', 110),
  ('Plantain Chips',        'Snacks & Sweets',  'per pack',       8, '🍟', 111),
  ('Chocolate',             'Snacks & Sweets',  'per bar',       15, '🍫', 112),
  ('Popcorn',               'Snacks & Sweets',  'per pack',       6, '🍿', 113),
  ('Toffees',               'Snacks & Sweets',  'per pack',      10, '🍬', 114),
  ('French Fries',          'Frozen Foods',     '1kg bag',       30, '🍟', 120),
  ('Ice Cream (1L)',        'Frozen Foods',     '1 litre tub',   40, '🍨', 121),
  ('Mixed Vegetables',      'Frozen Foods',     '500g bag',      25, '🥦', 122),
  ('Cerelac',               'Baby Care',        '400g tin',      55, '🍼', 130),
  ('Diapers (pack)',        'Baby Care',        'per pack',      60, '👶', 131),
  ('Baby Wipes',            'Baby Care',        'per pack',      15, '🧻', 132),
  ('Washing Powder',        'Household',        '1kg',           25, '🧺', 140),
  ('Dish Soap',             'Household',        'per bottle',    12, '🧽', 141),
  ('Bleach',                'Household',        'per bottle',    15, '🧴', 142),
  ('Toilet Rolls',          'Household',        '10 rolls',      35, '🧻', 143),
  ('Mosquito Spray',        'Household',        'per can',       28, '🦟', 144),
  ('Toothpaste',            'Personal Care',    'per tube',      15, '🪥', 150),
  ('Bath Soap',             'Personal Care',    'per bar',        8, '🧼', 151),
  ('Body Lotion',           'Personal Care',    'per bottle',    30, '🧴', 152),
  ('Shampoo',               'Personal Care',    'per bottle',    35, '🧴', 153),
  ('Roll-on',               'Personal Care',    'each',          20, '🧴', 154);
