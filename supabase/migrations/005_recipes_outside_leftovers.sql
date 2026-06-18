-- Recipes, prep-ahead reminders, eating-out entries, and leftovers.

-- Recipe + prep fields on meals
alter table meals add column if not exists servings        integer not null default 4;
alter table meals add column if not exists recipe_steps     text[]  not null default '{}';
alter table meals add column if not exists prep_ahead_note  text;          -- e.g. "Soak chickpeas overnight" (null = no prep)
alter table meals add column if not exists is_outside       boolean not null default false;  -- eating-out / takeout entry

-- meal_ingredients already exists (name, quantity, unit, macros) — reused for recipe ingredients.

-- Per-slot leftover flags on the weekly plan
alter table meal_plan_days add column if not exists breakfast_is_leftover boolean not null default false;
alter table meal_plan_days add column if not exists lunch_is_leftover     boolean not null default false;
alter table meal_plan_days add column if not exists snack_is_leftover     boolean not null default false;
alter table meal_plan_days add column if not exists dinner_is_leftover    boolean not null default false;
