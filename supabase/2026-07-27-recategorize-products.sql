-- Recategorize the shop into the owner's 14 food categories:
-- Fruits / Vegetables / Grains & Cereals / Tubers & Root Crops / Legumes & Pulses /
-- Meat / Fish & Seafood / Dairy Products / Eggs / Nuts & Seeds / Oils & Fats /
-- Herbs & Spices / Condiments & Sauces / Pasta & Noodles
-- Replaces the original seed list. Applied 2026-07-27 via the Management API.

delete from pp_products;

insert into pp_products (name, category, unit, price, emoji, sort_order) values
  -- Fruits
  ('Bananas',              'Fruits',              'per bunch',    12, '🍌', 10),
  ('Oranges',              'Fruits',              '10 pieces',    10, '🍊', 11),
  ('Pineapple',            'Fruits',              'each',         15, '🍍', 12),
  ('Watermelon',           'Fruits',              'each',         25, '🍉', 13),
  ('Mango',                'Fruits',              'each',          8, '🥭', 14),
  ('Pawpaw',               'Fruits',              'each',         15, '🍈', 15),
  ('Apples',               'Fruits',              '3 pieces',     20, '🍎', 16),
  -- Vegetables
  ('Fresh Tomatoes',       'Vegetables',          'per basket',   15, '🍅', 20),
  ('Onions',               'Vegetables',          'per bag',      12, '🧅', 21),
  ('Fresh Pepper',         'Vegetables',          'per bowl',     10, '🌶️', 22),
  ('Garden Eggs',          'Vegetables',          'per bowl',     12, '🍆', 23),
  ('Okro',                 'Vegetables',          'per bowl',     10, '🫛', 24),
  ('Cabbage',              'Vegetables',          'each',         10, '🥬', 25),
  ('Carrots',              'Vegetables',          'per bundle',    8, '🥕', 26),
  ('Lettuce',              'Vegetables',          'each',          8, '🥗', 27),
  -- Grains & Cereals
  ('Rice (5kg bag)',       'Grains & Cereals',    '5kg bag',     120, '🍚', 30),
  ('Rice (olonka)',        'Grains & Cereals',    'per olonka',   30, '🍚', 31),
  ('Maize',                'Grains & Cereals',    'per olonka',   20, '🌽', 32),
  ('Millet',               'Grains & Cereals',    'per olonka',   25, '🌾', 33),
  ('Wheat Flour (2kg)',    'Grains & Cereals',    '2kg pack',     30, '🌾', 34),
  ('Oats (500g)',          'Grains & Cereals',    '500g tin',     20, '🥣', 35),
  ('Cornflakes',           'Grains & Cereals',    '500g box',     35, '🥣', 36),
  -- Tubers & Root Crops
  ('Yam',                  'Tubers & Root Crops', 'per tuber',    25, '🍠', 40),
  ('Cassava',              'Tubers & Root Crops', 'per bundle',   15, '🥔', 41),
  ('Sweet Potatoes',       'Tubers & Root Crops', 'per bowl',     18, '🍠', 42),
  ('Cocoyam',              'Tubers & Root Crops', 'per bowl',     20, '🥔', 43),
  ('Plantain',             'Tubers & Root Crops', 'per bunch',    20, '🍌', 44),
  ('Gari (2kg)',           'Tubers & Root Crops', '2kg pack',     28, '🥣', 45),
  -- Legumes & Pulses
  ('Black-eyed Beans',     'Legumes & Pulses',    'per olonka',   25, '🫘', 50),
  ('Red Beans',            'Legumes & Pulses',    'per olonka',   28, '🫘', 51),
  ('Soya Beans',           'Legumes & Pulses',    'per olonka',   22, '🫘', 52),
  ('Bambara Beans',        'Legumes & Pulses',    'per olonka',   26, '🫘', 53),
  ('Lentils',              'Legumes & Pulses',    '500g pack',    30, '🫘', 54),
  -- Meat
  ('Frozen Chicken',       'Meat',                'per kg',       48, '🍗', 60),
  ('Beef',                 'Meat',                'per kg',       60, '🥩', 61),
  ('Goat Meat',            'Meat',                'per kg',       70, '🍖', 62),
  ('Gizzard',              'Meat',                'per kg',       40, '🍗', 63),
  ('Sausages',             'Meat',                'per pack',     35, '🌭', 64),
  -- Fish & Seafood
  ('Fresh Tilapia',        'Fish & Seafood',      'per kg',       45, '🐟', 70),
  ('Salmon (frozen)',      'Fish & Seafood',      'per kg',       50, '🐟', 71),
  ('Smoked Herrings',      'Fish & Seafood',      '5 pieces',     20, '🐠', 72),
  ('Salted Fish (Koobi)',  'Fish & Seafood',      'per piece',    15, '🐟', 73),
  ('Sardines (tin)',       'Fish & Seafood',      'per tin',      12, '🥫', 74),
  ('Tuna (tin)',           'Fish & Seafood',      'per tin',      18, '🥫', 75),
  ('Shrimps',              'Fish & Seafood',      'per pack',     55, '🦐', 76),
  -- Dairy Products
  ('Fresh Milk (1L)',      'Dairy Products',      '1 litre',      30, '🥛', 80),
  ('Evaporated Milk',      'Dairy Products',      'per tin',      15, '🥫', 81),
  ('Milk Powder (400g)',   'Dairy Products',      '400g tin',     45, '🥛', 82),
  ('Yoghurt',              'Dairy Products',      'per bottle',   12, '🍦', 83),
  ('Butter (250g)',        'Dairy Products',      '250g',         35, '🧈', 84),
  ('Cheese (250g)',        'Dairy Products',      '250g',         45, '🧀', 85),
  -- Eggs
  ('Eggs (full crate)',    'Eggs',                '30 pieces',    55, '🥚', 90),
  ('Eggs (half crate)',    'Eggs',                '15 pieces',    30, '🥚', 91),
  ('Quail Eggs',           'Eggs',                '10 pieces',    25, '🥚', 92),
  -- Nuts & Seeds
  ('Groundnuts',           'Nuts & Seeds',        'per bowl',     15, '🥜', 100),
  ('Cashew Nuts',          'Nuts & Seeds',        'per pack',     40, '🥜', 101),
  ('Tiger Nuts',           'Nuts & Seeds',        'per bowl',     12, '🥜', 102),
  ('Egusi (Melon Seeds)',  'Nuts & Seeds',        'per bowl',     20, '🌻', 103),
  ('Sesame Seeds',         'Nuts & Seeds',        'per bowl',     18, '🌻', 104),
  -- Oils & Fats
  ('Palm Oil (1L)',        'Oils & Fats',         '1 litre',      35, '🫙', 110),
  ('Vegetable Oil (1L)',   'Oils & Fats',         '1 litre',      40, '🫒', 111),
  ('Groundnut Oil (1L)',   'Oils & Fats',         '1 litre',      42, '🫙', 112),
  ('Coconut Oil (500ml)',  'Oils & Fats',         '500ml',        45, '🥥', 113),
  ('Margarine (250g)',     'Oils & Fats',         '250g tub',     25, '🧈', 114),
  -- Herbs & Spices
  ('Ginger',               'Herbs & Spices',      'per bowl',      8, '🫚', 120),
  ('Garlic',               'Herbs & Spices',      'per bowl',     10, '🧄', 121),
  ('Salt (1kg)',           'Herbs & Spices',      '1kg pack',      5, '🧂', 122),
  ('Curry Powder',         'Herbs & Spices',      'per pack',     10, '🧂', 123),
  ('Black Pepper',         'Herbs & Spices',      'per pack',     15, '🧂', 124),
  ('Maggi Cubes',          'Herbs & Spices',      'per pack',     12, '🧂', 125),
  ('Bay Leaves',           'Herbs & Spices',      'per pack',      8, '🌿', 126),
  -- Condiments & Sauces
  ('Tomato Paste',         'Condiments & Sauces', 'per tin',       8, '🥫', 130),
  ('Shito',                'Condiments & Sauces', 'per jar',      25, '🌶️', 131),
  ('Ketchup',              'Condiments & Sauces', 'per bottle',   18, '🍅', 132),
  ('Mayonnaise',           'Condiments & Sauces', 'per jar',      22, '🥫', 133),
  ('Soy Sauce',            'Condiments & Sauces', 'per bottle',   15, '🍶', 134),
  ('Vinegar',              'Condiments & Sauces', 'per bottle',   12, '🍶', 135),
  -- Pasta & Noodles
  ('Spaghetti',            'Pasta & Noodles',     'per pack',      8, '🍝', 140),
  ('Macaroni',             'Pasta & Noodles',     'per pack',     10, '🍝', 141),
  ('Indomie (carton)',     'Pasta & Noodles',     '40 packs',     75, '🍜', 142),
  ('Indomie (single)',     'Pasta & Noodles',     'per pack',      3, '🍜', 143),
  ('Egg Noodles',          'Pasta & Noodles',     'per pack',     12, '🍜', 144);
