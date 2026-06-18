-- Seed: set family name + Indian Hindu vegetarian, balanced high-protein meal library.
-- Single-tenant: targets the one row in `families`.
-- Safe to re-run: clears existing seeded meals (tag 'seed') first.

-- 1. Rename the family so it shows on the dashboard / nav
update families set name = 'Makoday''s Meal';

-- 2. Reset previously seeded meals (leaves any meals you added by hand)
delete from meals
where family_id = (select id from families limit 1)
  and 'seed' = any(tags);

-- 3. Insert the library
insert into meals (family_id, name, description, meal_type, calories, protein_g, carbs_g, fat_g, tags)
select (select id from families limit 1), m.name, m.description, m.meal_type,
       m.calories, m.protein_g, m.carbs_g, m.fat_g, m.tags
from (values
  -- ---------- BREAKFAST ----------
  ('Moong Dal Chilla (2) with Mint Chutney', 'Savory yellow-lentil crepes; high plant protein, light on fat', 'breakfast', 320, 18, 35, 9, array['seed','high-protein','vegetarian','breakfast']),
  ('Paneer Bhurji with Multigrain Roti', 'Scrambled paneer with tomatoes & spices; calcium + protein rich', 'breakfast', 400, 24, 30, 18, array['seed','high-protein','vegetarian','breakfast']),
  ('Besan Chilla with Curd', 'Gram-flour pancake served with a bowl of yogurt', 'breakfast', 350, 17, 33, 14, array['seed','high-protein','vegetarian','breakfast']),
  ('Sprouts & Peanut Poha', 'Flattened rice with moong sprouts and peanuts for extra protein', 'breakfast', 300, 12, 45, 8, array['seed','vegetarian','breakfast']),
  ('Vegetable Upma with Peanuts', 'Semolina with vegetables and roasted peanuts', 'breakfast', 330, 11, 48, 11, array['seed','vegetarian','breakfast']),
  ('Oats Idli with Sambar', 'Steamed oats idli with protein-packed lentil sambar', 'breakfast', 280, 13, 40, 7, array['seed','vegetarian','breakfast','light']),
  ('Tofu Paratha with Curd', 'Whole-wheat paratha stuffed with spiced tofu, served with yogurt', 'breakfast', 390, 22, 38, 16, array['seed','high-protein','vegetarian','breakfast']),

  -- ---------- LUNCH ----------
  ('Rajma Chawal with Salad', 'Kidney-bean curry over rice with a fresh salad', 'lunch', 480, 20, 70, 12, array['seed','high-protein','vegetarian','lunch']),
  ('Chana Masala with Brown Rice', 'Chickpea curry with fibre-rich brown rice', 'lunch', 470, 19, 68, 13, array['seed','high-protein','vegetarian','lunch']),
  ('Palak Paneer with 2 Roti', 'Spinach and cottage-cheese curry; iron + protein', 'lunch', 450, 25, 40, 22, array['seed','high-protein','vegetarian','lunch']),
  ('Dal Tadka, Jeera Rice & Curd', 'Tempered lentils with cumin rice and a side of yogurt', 'lunch', 430, 18, 60, 12, array['seed','vegetarian','lunch']),
  ('Soya Chunk Curry with Roti', 'High-protein soy curry with whole-wheat roti', 'lunch', 440, 30, 45, 14, array['seed','high-protein','vegetarian','lunch']),
  ('Lobia Curry with Rice', 'Black-eyed pea curry served over rice', 'lunch', 450, 20, 65, 12, array['seed','high-protein','vegetarian','lunch']),
  ('Mixed Dal Khichdi with Curd', 'One-pot lentil-rice comfort meal with yogurt', 'lunch', 410, 17, 58, 11, array['seed','vegetarian','lunch','light']),

  -- ---------- SNACK ----------
  ('Roasted Chana & Peanuts', 'Crunchy roasted chickpeas and peanuts', 'snack', 200, 11, 22, 8, array['seed','high-protein','vegetarian','snack']),
  ('Grilled Paneer Tikka', 'Marinated grilled cottage cheese cubes', 'snack', 250, 18, 8, 16, array['seed','high-protein','vegetarian','snack']),
  ('Sprouts Chaat', 'Tangy moong-sprout salad with lemon and spices', 'snack', 180, 12, 25, 4, array['seed','high-protein','vegetarian','snack','light']),
  ('Greek Yogurt with Nuts', 'Thick yogurt topped with almonds and walnuts', 'snack', 220, 15, 18, 10, array['seed','high-protein','vegetarian','snack']),
  ('Steamed Dhokla', 'Fermented gram-flour steamed cake', 'snack', 190, 9, 28, 5, array['seed','vegetarian','snack','light']),
  ('Masala Buttermilk with Almonds', 'Spiced buttermilk and a handful of almonds', 'snack', 180, 9, 12, 11, array['seed','vegetarian','snack','light']),
  ('Moong Sprout Salad', 'Fresh sprouted moong with cucumber and tomato', 'snack', 170, 11, 24, 3, array['seed','high-protein','vegetarian','snack','light']),

  -- ---------- DINNER ----------
  ('Paneer Tikka Masala with 2 Roti', 'Grilled paneer in spiced tomato gravy with roti', 'dinner', 470, 26, 42, 22, array['seed','high-protein','vegetarian','dinner']),
  ('Mix Veg, Dal & 2 Roti', 'Seasonal vegetables, lentils and whole-wheat roti', 'dinner', 430, 18, 55, 14, array['seed','vegetarian','dinner']),
  ('Baked Paneer with Quinoa Pulao', 'Lightly baked paneer over protein-rich quinoa pulao', 'dinner', 450, 27, 40, 20, array['seed','high-protein','vegetarian','dinner']),
  ('Kadhi with Brown Rice', 'Yogurt-gram-flour curry with brown rice', 'dinner', 400, 15, 55, 13, array['seed','vegetarian','dinner']),
  ('Chole with 2 Roti', 'Spiced chickpea curry with whole-wheat roti', 'dinner', 460, 19, 60, 14, array['seed','high-protein','vegetarian','dinner']),
  ('Veg & Soya Pulao with Raita', 'Soy-and-vegetable rice with cooling yogurt raita', 'dinner', 440, 22, 58, 13, array['seed','high-protein','vegetarian','dinner']),
  ('Light Dal Makhani with Jeera Rice', 'Slow-cooked black lentils (low cream) with cumin rice', 'dinner', 470, 18, 62, 16, array['seed','vegetarian','dinner'])
) as m(name, description, meal_type, calories, protein_g, carbs_g, fat_g, tags);
